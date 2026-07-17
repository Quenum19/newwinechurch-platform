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
    /**
     * Stats globales sur les départements pour le dashboard de la liste admin.
     * Calculé en 2 requêtes agrégées — pas de COUNT par dept côté PHP.
     */
    public function stats(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Department::class);

        $depts = Department::query()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active_count")
            ->selectRaw("SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count")
            ->selectRaw('SUM(CASE WHEN governor_id IS NOT NULL THEN 1 ELSE 0 END) as with_governor')
            ->selectRaw('SUM(CASE WHEN governor_id IS NULL THEN 1 ELSE 0 END) as without_governor')
            ->selectRaw('SUM(member_count_cache) as total_members')
            ->first();

        return response()->json([
            'total'            => (int) $depts->total,
            'active'           => (int) $depts->active_count,
            'pending'          => (int) $depts->pending_count,
            'with_governor'    => (int) $depts->with_governor,
            'without_governor' => (int) $depts->without_governor,
            'total_members'    => (int) $depts->total_members,
        ]);
    }

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
        // Filtre cliqué depuis les cards : ?governor=with|without
        if ($g = $request->query('governor')) {
            if ($g === 'with')    $query->whereNotNull('governor_id');
            if ($g === 'without') $query->whereNull('governor_id');
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

        // Sépare l'upload bannière du reste des champs (le fill() ne doit pas
        // recevoir l'objet UploadedFile, qui n'est pas un attribut Eloquent).
        $data = collect($request->validated())->except(['banner_image'])->all();
        $dept->fill($data)->save();

        if ($request->hasFile('banner_image')) {
            $disk = \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'));
            $file = $request->file('banner_image');
            $ext  = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $path = sprintf('departments/banners/%s.%s', bin2hex(random_bytes(8)), $ext);
            $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);

            // Supprime l'ancienne bannière si elle existait (et n'est pas externe).
            $old = $dept->banner_image;
            if ($old && ! str_starts_with($old, 'http')) {
                $oldPath = ltrim(str_replace('/storage/', '', $old), '/');
                if ($disk->exists($oldPath)) $disk->delete($oldPath);
            }

            $dept->update(['banner_image' => $path]);
        }

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

        try {
            DB::transaction(function () use ($dept, $governorId, $request) {
                // 1. Si l'ancien gouverneur était pivot avec role=governor → repasse en member.
                if ($dept->governor_id && $dept->governor_id !== $governorId) {
                    $dept->members()->updateExistingPivot($dept->governor_id, ['role' => 'member']);
                    // Et on clôture son mandat dans department_governors.
                    DB::table('department_governors')
                        ->where('department_id', $dept->id)
                        ->where('user_id', $dept->governor_id)
                        ->whereNull('ended_at')
                        ->update(['ended_at' => now()->toDateString(), 'updated_at' => now()]);
                    // Désactive le flag is_governor + retire le rôle Spatie "gouverneur"
                    // SI l'utilisateur n'a plus aucun mandat actif sur AUCUN dept.
                    // Sans ce reset complet, l'user gardait accès à /gouverneur même
                    // après retrait de TOUS ses départements (bug observé 2026-06-XX).
                    $old = User::find($dept->governor_id);
                    $stillGovernor = DB::table('department_governors')
                        ->where('user_id', $dept->governor_id)
                        ->whereNull('ended_at')
                        ->exists();
                    if ($old && ! $stillGovernor) {
                        $old->forceFill(['is_governor' => false])->save();
                        if ($old->hasRole('gouverneur')) {
                            $old->removeRole('gouverneur');
                        }
                    }
                    // Si l'ancien gouverneur PERD juste CE dept mais en garde
                    // d'autres → on met à jour son department_id "principal" sur
                    // un autre dept actif (sinon le dashboard pointe vers un dept
                    // qu'il ne gouverne plus).
                    if ($old && $stillGovernor && $old->department_id === $dept->id) {
                        $newPrincipal = DB::table('department_governors')
                            ->where('user_id', $dept->governor_id)
                            ->whereNull('ended_at')
                            ->orderByDesc('appointed_at')
                            ->value('department_id');
                        if ($newPrincipal) {
                            $old->update(['department_id' => $newPrincipal]);
                        }
                    }
                }

                // 2. Le nouveau gouverneur est ajouté/promu en pivot avec role=governor.
                if ($governorId) {
                    // Sécurité prod : clôture TOUS les mandats actifs résiduels
                    // pour ce user sur ce dept (au cas où un précédent test a laissé
                    // une ligne ended_at=null orpheline → INSERT planterait sur
                    // contrainte d'unicité métier).
                    DB::table('department_governors')
                        ->where('department_id', $dept->id)
                        ->where('user_id', $governorId)
                        ->whereNull('ended_at')
                        ->update(['ended_at' => now()->toDateString(), 'updated_at' => now()]);

                    if ($dept->members()->where('users.id', $governorId)->exists()) {
                        $dept->members()->updateExistingPivot($governorId, ['role' => 'governor']);
                    } else {
                        $dept->members()->attach($governorId, [
                            'role'      => 'governor',
                            'joined_at' => now()->toDateString(),
                        ]);
                    }
                    // 3. Rôle Spatie "gouverneur" + flags utilisateur.
                    $governor = User::find($governorId);
                    if ($governor && ! $governor->hasRole('gouverneur')) {
                        $governor->assignRole('gouverneur');
                    }
                    $governor?->forceFill([
                        'is_governor'   => true,
                        'department_id' => $dept->id,
                    ])->save();
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

                // 5. Mise à jour du cache department.governor_id + member_count_cache.
                $dept->update([
                    'governor_id'        => $governorId,
                    'status'             => $governorId ? 'active' : $dept->status,
                    'member_count_cache' => $dept->members()->count(),
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Erreur assignation gouverneur : ' . $e->getMessage(),
                'error'   => class_basename($e),
                'where'   => basename($e->getFile()) . ':' . $e->getLine(),
            ], 500);
        }

        return response()->json([
            'message' => $governorId ? 'Gouverneur assigné.' : 'Gouverneur retiré.',
            'dept'    => [
                'id'           => $dept->fresh()->id,
                'governor_id'  => $dept->fresh()->governor_id,
                'status'       => $dept->fresh()->status,
            ],
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

        $userId = (int) $data['user_id'];
        $role   = $data['role'] ?? 'member';

        try {
            DB::transaction(function () use ($dept, $userId, $role) {
                $exists = $dept->members()->where('users.id', $userId)->exists();
                if ($exists) {
                    $dept->members()->updateExistingPivot($userId, [
                        'role' => $role, 'updated_at' => now(),
                    ]);
                } else {
                    $dept->members()->attach($userId, [
                        'role'      => $role,
                        'joined_at' => now()->toDateString(),
                    ]);
                }
                // Synchronise le cache denormalisé pour que le frontend
                // (qui lit member_count_cache pour la perf) affiche le bon chiffre.
                $dept->update(['member_count_cache' => $dept->members()->count()]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Échec ajout du membre : ' . $e->getMessage(),
                'error'   => class_basename($e),
            ], 500);
        }

        $now = $dept->members()->where('users.id', $userId)->exists();
        if (! $now) {
            return response()->json([
                'message' => 'Ajout silencieusement bloqué — vérifie permissions DB ou observers.',
            ], 500);
        }

        $members = $dept->fresh()->members()
            ->select('users.id', 'users.name', 'users.first_name', 'users.avatar')
            ->orderBy('users.name')
            ->get();

        return response()->json([
            'message'      => 'Membre ajouté au département.',
            'members_count'=> $members->count(),
            'members'      => $members,
        ]);
    }

    /**
     * Historique complet des gouverneurs d'un département.
     * Inclut mandats actifs (ended_at=null) + clos, joints sur User pour
     * afficher avatar/nom. Pour export ou affichage UI timeline.
     */
    public function governorsHistory(Request $request, int $id): JsonResponse
    {
        $dept = Department::findOrFail($id);
        Gate::authorize('view', $dept);

        $mandats = DB::table('department_governors as dg')
            ->leftJoin('users as u', 'u.id', '=', 'dg.user_id')
            ->leftJoin('users as apt', 'apt.id', '=', 'dg.appointed_by')
            ->where('dg.department_id', $id)
            ->whereNull('dg.deleted_at')
            ->orderByDesc('dg.appointed_at')
            ->orderByDesc('dg.id')
            ->select([
                'dg.id', 'dg.is_primary',
                'dg.appointed_at', 'dg.ended_at', 'dg.notes',
                'u.id as user_id', 'u.first_name', 'u.name as last_name', 'u.avatar', 'u.email',
                'apt.first_name as appointed_by_first_name', 'apt.name as appointed_by_last_name',
            ])
            ->get();

        // Export CSV si demandé (?format=csv)
        if ($request->query('format') === 'csv') {
            $csv  = "Mandat;Gouverneur;Email;Nominé le;Fin de mandat;Statut;Nominé par;Notes\n";
            foreach ($mandats as $m) {
                $name = trim(($m->first_name ?? '') . ' ' . ($m->last_name ?? ''));
                $by   = trim(($m->appointed_by_first_name ?? '') . ' ' . ($m->appointed_by_last_name ?? ''));
                $row = [
                    $m->is_primary ? 'Principal' : 'Adjoint',
                    $name,
                    $m->email ?? '',
                    $m->appointed_at ?? '',
                    $m->ended_at ?? '',
                    $m->ended_at ? 'Clôturé' : 'En cours',
                    $by ?: '',
                    str_replace(["\n", ';'], [' ', ','], (string) $m->notes),
                ];
                $csv .= implode(';', array_map(fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"', $row)) . "\n";
            }
            return response()->json([
                'message' => 'csv',
                'data'    => base64_encode("\xEF\xBB\xBF" . $csv), // BOM UTF-8 pour Excel
                'filename'=> 'historique_gouverneurs_' . str_replace(' ', '_', mb_strtolower($dept->name)) . '.csv',
            ]);
        }

        return response()->json([
            'data' => $mandats->map(fn ($m) => [
                'id'           => $m->id,
                'is_primary'   => (bool) $m->is_primary,
                'appointed_at' => $m->appointed_at,
                'ended_at'     => $m->ended_at,
                'is_active'    => $m->ended_at === null,
                'notes'        => $m->notes,
                'user' => [
                    'id'         => $m->user_id,
                    'first_name' => $m->first_name,
                    'last_name'  => $m->last_name,
                    'full_name'  => trim(($m->first_name ?? '') . ' ' . ($m->last_name ?? '')),
                    'avatar'     => $m->avatar,
                    'email'      => $m->email,
                ],
                'appointed_by' => $m->appointed_by_first_name ? trim(($m->appointed_by_first_name ?? '') . ' ' . ($m->appointed_by_last_name ?? '')) : null,
            ]),
        ]);
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
        // Sync cache denormalisé
        $dept->update(['member_count_cache' => $dept->members()->count()]);

        return response()->json(['message' => 'Membre retiré du département.']);
    }
}
