<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDepartmentRequest;
use App\Http\Requests\Admin\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Http\Resources\Admin\AdminMemberResource;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Admin → Départements.
 *
 *  - Admins voient tous (active + pending)
 *  - Gouverneurs (ex-capitaines) voient liste filtrée à leurs départements (Policy)
 *  - Mutations protégées par DepartmentPolicy::update / delete
 *
 * Refonte Étape 1 : captain_id → governor_id, role 'captain' du pivot → 'governor'.
 */
class DepartmentsController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Department::class);

        $query = Department::with('governor:id,name,first_name,avatar')
            ->withCount('members');

        // Staff (superadmin/pasteur/rh/admin) voit tous les départements.
        // Les autres (gouverneur principalement) sont restreints à leurs dépts.
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'pasteur', 'rh', 'admin'])) {
            $query->where(function ($q) use ($user) {
                $q->where('governor_id', $user->id)
                  ->orWhereHas('members', fn ($q) => $q->where('users.id', $user->id));
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where('name', 'like', "%{$search}%");
        }

        $query->ordered();

        $perPage = min((int) $request->query('per_page', 50), 100);
        return DepartmentResource::collection($query->paginate($perPage));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $dept = Department::with('governor:id,name,first_name,avatar,bio')
            ->withCount('members')
            ->findOrFail($id);

        Gate::authorize('view', $dept);

        // On retourne aussi la liste des membres (paginé séparément si besoin).
        $members = $dept->members()
            ->select('users.id', 'users.name', 'users.first_name', 'users.avatar')
            ->orderBy('users.name')
            ->paginate(50);

        return response()->json([
            'data'    => new DepartmentResource($dept),
            'members' => AdminMemberResource::collection($members),
        ]);
    }

    public function store(StoreDepartmentRequest $request): DepartmentResource
    {
        Gate::authorize('create', Department::class);

        $dept = Department::create($request->validated());
        return new DepartmentResource($dept->load('governor')->loadCount('members'));
    }

    public function update(UpdateDepartmentRequest $request, int $id): DepartmentResource
    {
        $dept = Department::findOrFail($id);
        Gate::authorize('update', $dept);

        $dept->fill($request->validated())->save();
        return new DepartmentResource($dept->fresh('governor')->loadCount('members'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        Gate::authorize('delete', $dept);

        $dept->delete();
        return response()->json(['message' => 'Département supprimé.']);
    }

    /** Assigner un gouverneur au département. */
    public function assignGovernor(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        Gate::authorize('assignGovernor', $dept);

        // Compat ascendante : accepte governor_id (canonique) OU captain_id (legacy frontend).
        $request->validate([
            'governor_id' => ['nullable', 'integer', 'exists:users,id'],
            'captain_id'  => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $governorId = $request->input('governor_id', $request->input('captain_id'));

        DB::transaction(function () use ($dept, $governorId) {
            // 1. Si l'ancien gouverneur était pivot avec role=governor → repasse en member.
            if ($dept->governor_id && $dept->governor_id !== $governorId) {
                $dept->members()->updateExistingPivot($dept->governor_id, ['role' => 'member']);
                // Et on clôture son mandat dans department_governors.
                DB::table('department_governors')
                    ->where('department_id', $dept->id)
                    ->where('user_id', $dept->governor_id)
                    ->whereNull('ended_at')
                    ->update(['ended_at' => now()->toDateString(), 'updated_at' => now()]);
                // Désactive le flag is_governor si l'utilisateur n'a plus aucun mandat actif.
                $old = User::find($dept->governor_id);
                $stillGovernor = DB::table('department_governors')
                    ->where('user_id', $dept->governor_id)
                    ->whereNull('ended_at')
                    ->exists();
                if ($old && ! $stillGovernor) {
                    $old->update(['is_governor' => false]);
                }
            }

            // 2. Le nouveau gouverneur est ajouté/promu en pivot avec role=governor.
            if ($governorId) {
                if ($dept->members()->where('users.id', $governorId)->exists()) {
                    $dept->members()->updateExistingPivot($governorId, ['role' => 'governor']);
                } else {
                    $dept->members()->attach($governorId, ['role' => 'governor', 'joined_at' => now()]);
                }
                // 3. Rôle Spatie "gouverneur" + flags utilisateur.
                $governor = User::find($governorId);
                if ($governor && ! $governor->hasRole('gouverneur')) {
                    $governor->assignRole('gouverneur');
                }
                $governor?->update([
                    'is_governor'   => true,
                    'department_id' => $dept->id,
                ]);
                // 4. Nouveau mandat actif dans department_governors.
                DB::table('department_governors')->insert([
                    'department_id' => $dept->id,
                    'user_id'       => $governorId,
                    'is_primary'    => true,
                    'appointed_at'  => now()->toDateString(),
                    'ended_at'      => null,
                    'appointed_by'  => $request->user()->id,
                    'notes'         => null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            // 5. Mise à jour du cache department.governor_id.
            $dept->update([
                'governor_id' => $governorId,
                'status'      => $governorId ? 'active' : $dept->status,
            ]);
        });

        return response()->json([
            'message' => $governorId ? 'Gouverneur assigné.' : 'Gouverneur retiré.',
        ]);
    }

    /** Ajout d'un membre au département (pivot). */
    public function addMember(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        Gate::authorize('update', $dept);

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role'    => ['nullable', 'in:governor,assistant,member'],
        ]);

        $dept->members()->syncWithoutDetaching([
            $data['user_id'] => ['role' => $data['role'] ?? 'member', 'joined_at' => now()],
        ]);

        return response()->json(['message' => 'Membre ajouté au département.']);
    }

    /** Retrait d'un membre du département (pivot). */
    public function removeMember(Request $request, int $id, int $userId): JsonResponse
    {
        $dept = Department::findOrFail($id);
        Gate::authorize('update', $dept);

        // Empêcher de retirer le gouverneur via cet endpoint.
        if ($dept->governor_id === $userId) {
            return response()->json([
                'message' => 'Retirez d\'abord ce membre comme gouverneur.',
            ], 422);
        }

        $dept->members()->detach($userId);
        return response()->json(['message' => 'Membre retiré du département.']);
    }
}
