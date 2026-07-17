<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Events\GovernorAssigned;
use App\Http\Requests\Admin\AssignGovernorRequest;
use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\GovernorProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Admin — gestion des gouverneurs (vue d'ensemble, assignation, retrait).
 *
 * Toutes les mutations sont transactionnelles et synchronisent :
 *  - cache departments.governor_id
 *  - flag users.is_governor
 *  - pivot department_user role
 *  - department_governors (mandats avec appointed_at/ended_at)
 */
class AdminGovernorsController extends Controller
{
    public function index(Request $request)
    {
        \Illuminate\Support\Facades\Gate::authorize('viewAny', \App\Models\Department::class);

        // Liste des gouverneurs actifs (avec mandats ouverts).
        // 1 ligne par mandat actif (un user peut en avoir plusieurs).
        $mandates = DepartmentGovernor::whereNull('ended_at')
            ->with([
                'user:id,name,first_name,avatar,email,phone',
                'user.governorProfile',
                'department:id,name,slug,color_theme,banner_image',
            ])
            ->orderByDesc('is_primary')
            ->orderByDesc('appointed_at');

        $perPage = min((int) $request->query('per_page', 30), 100);
        $page = $mandates->cursorPaginate($perPage);

        // Enrichissement des stats par mandat (en bulk).
        $deptIds = $page->getCollection()->pluck('department_id')->unique()->all();
        $memberCounts = DB::table('department_user')
            ->whereIn('department_id', $deptIds)
            ->select('department_id', DB::raw('COUNT(*) as c'))
            ->groupBy('department_id')
            ->pluck('c', 'department_id');

        $reportPending = DB::table('department_reports')
            ->whereIn('department_id', $deptIds)
            ->where('status', 'submitted')
            ->select('department_id', DB::raw('COUNT(*) as c'))
            ->groupBy('department_id')
            ->pluck('c', 'department_id');

        $page->setCollection($page->getCollection()->map(function (DepartmentGovernor $m) use ($memberCounts, $reportPending) {
            return [
                'id'             => $m->id,
                'user'           => $m->user ? [
                    'id'        => $m->user->id,
                    'full_name' => $m->user->full_name,
                    'email'     => $m->user->email,
                    'phone'     => $m->user->phone,
                    'avatar'    => $m->user->avatar_url,
                    'bio'       => $m->user->governorProfile->bio ?? null,
                ] : null,
                'department'     => $m->department ? [
                    'id'   => $m->department->id,
                    'name' => $m->department->name,
                    'slug' => $m->department->slug,
                ] : null,
                'is_primary'     => (bool) $m->is_primary,
                'appointed_at'   => $m->appointed_at?->toDateString(),
                'stats' => [
                    'members_count'         => (int) ($memberCounts[$m->department_id] ?? 0),
                    'reports_pending_count' => (int) ($reportPending[$m->department_id] ?? 0),
                ],
            ];
        }));

        return $page;
    }

    /** Assigner un gouverneur à un département. Transaction atomique. */
    public function assign(AssignGovernorRequest $request, int $departmentId): JsonResponse
    {
        $dept = Department::findOrFail($departmentId);
        $userId    = (int) $request->input('user_id');
        $isPrimary = (bool) $request->input('is_primary', true);

        $user = User::findOrFail($userId);

        DB::transaction(function () use ($dept, $user, $isPrimary, $request) {
            // Si on désigne un primaire, basculer tous les autres mandats du dept en non-primary.
            if ($isPrimary) {
                DepartmentGovernor::where('department_id', $dept->id)
                    ->whereNull('ended_at')
                    ->update(['is_primary' => false]);
            }

            // Crée le mandat (sans clore les co-gouverneurs).
            DepartmentGovernor::create([
                'user_id'       => $user->id,
                'department_id' => $dept->id,
                'is_primary'    => $isPrimary,
                'appointed_at'  => now()->toDateString(),
                'ended_at'      => null,
                'appointed_by'  => $request->user()->id,
                'notes'         => $request->input('notes'),
            ]);

            // Pivot department_user.
            DB::table('department_user')->updateOrInsert(
                ['department_id' => $dept->id, 'user_id' => $user->id],
                [
                    'role'       => 'governor',
                    'joined_at'  => now()->toDateString(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Cache departments.governor_id si primaire.
            if ($isPrimary) {
                $dept->update([
                    'governor_id' => $user->id,
                    'status'      => 'active',
                    'is_active'   => true,
                ]);
            }

            // Rôle Spatie + flag + cache department_id.
            if (! $user->hasRole('gouverneur')) {
                $user->assignRole('gouverneur');
            }
            // forceFill : is_governor hors $fillable (protection mass assignment)
            $user->forceFill([
                'is_governor'   => true,
                'department_id' => $dept->id,
            ])->save();

            // Profil enrichi initialisé (vide si pas encore créé).
            GovernorProfile::firstOrCreate(['user_id' => $user->id]);
        });

        // Fire l'event : NotifyNewGovernor s'abonne (notif inbox + email + broadcast).
        GovernorAssigned::dispatch($user, $dept, $request->user());

        activity('governors')
            ->causedBy($request->user())
            ->performedOn($dept)
            ->withProperties(['governor_id' => $user->id, 'is_primary' => $isPrimary])
            ->log('Gouverneur assigné');

        Cache::forget(\App\Http\Controllers\Governor\GovernorDashboardController::cacheKey($dept->id));

        return response()->json([
            'message' => 'Gouverneur assigné. Email de bienvenue envoyé.',
        ], 201);
    }

    /** Retirer un gouverneur (ended_at = now, désactive is_governor si plus de mandat). */
    public function remove(Request $request, int $departmentId, int $userId): JsonResponse
    {
        \Illuminate\Support\Facades\Gate::authorize('assignGovernor', Department::findOrFail($departmentId));

        $dept = Department::findOrFail($departmentId);
        $user = User::findOrFail($userId);

        DB::transaction(function () use ($dept, $user, $request) {
            // Clôture tous les mandats actifs du user pour ce dept.
            DepartmentGovernor::where('department_id', $dept->id)
                ->where('user_id', $user->id)
                ->whereNull('ended_at')
                ->update([
                    'ended_at'   => now()->toDateString(),
                    'updated_at' => now(),
                ]);

            // Si c'était le primary cache, on cherche un remplaçant parmi les mandats actifs restants.
            if ($dept->governor_id === $user->id) {
                $replacement = DepartmentGovernor::where('department_id', $dept->id)
                    ->whereNull('ended_at')
                    ->orderByDesc('is_primary')
                    ->orderByDesc('appointed_at')
                    ->first();
                $dept->update(['governor_id' => $replacement?->user_id]);
            }

            // Pivot department_user : on repasse en member (on ne détache pas).
            DB::table('department_user')
                ->where('department_id', $dept->id)
                ->where('user_id', $user->id)
                ->update(['role' => 'member', 'updated_at' => now()]);

            // Vérifie s'il reste au moins un mandat actif ailleurs.
            $hasOther = DepartmentGovernor::where('user_id', $user->id)
                ->whereNull('ended_at')
                ->exists();
            if (! $hasOther) {
                $user->forceFill(['is_governor' => false])->save();
                if ($user->hasRole('gouverneur')) {
                    $user->removeRole('gouverneur');
                }
            }
        });

        activity('governors')
            ->causedBy($request->user())
            ->performedOn($dept)
            ->withProperties(['removed_user_id' => $user->id])
            ->log('Gouverneur retiré');

        Cache::forget(\App\Http\Controllers\Governor\GovernorDashboardController::cacheKey($dept->id));

        return response()->json(['message' => 'Gouverneur retiré.']);
    }
}
