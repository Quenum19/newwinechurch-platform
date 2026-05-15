<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignRolesRequest;
use App\Http\Requests\Admin\StoreMemberRequest;
use App\Http\Requests\Admin\UpdateMemberRequest;
use App\Http\Resources\Admin\AdminMemberResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Admin → Membres (CRUD + filtres + assign rôles + soft delete + restore).
 *
 * Sécurité :
 *  - Permissions Spatie via FormRequest::authorize() (view/create/edit/delete members)
 *  - assign roles : permission "assign roles" (avec garde supplémentaire dans
 *    AssignRolesRequest empêchant un admin non-superadmin de promouvoir superadmin/pasteur)
 *  - softDeletes systématiques (jamais de DELETE SQL réel)
 *  - rate limit standard `api` (60 req/min)
 *
 * Scalabilité :
 *  - Pagination obligatoire (max 100 par page)
 *  - Eager loading conditionnel (with('roles') déjà bon, with('donations') seulement
 *    si nécessaire car join coûteux)
 *  - Recherche fulltext : LIKE sur name+email+phone (sufficient pour < 100k members ;
 *    au-delà passer Scout/Meilisearch en Phase 8)
 *  - Index utilisés : status, [status,created_at], email, phone
 */
class MembersController extends Controller
{
    /**
     * Liste paginée des membres avec filtres.
     *
     * Query params supportés :
     *   ?search=mot       → LIKE sur name + email + phone
     *   ?status=active    → filtre par statut
     *   ?role=membre      → filtre par rôle Spatie
     *   ?department=12    → filtre par département (id)
     *   ?baptized=1       → membres baptisés uniquement
     *   ?trashed=1        → afficher les supprimés (soft) — pour la corbeille admin
     *   ?per_page=25      → pagination (max 100)
     *   ?sort=created_at  → champ de tri (default: created_at)
     *   ?direction=desc   → asc/desc
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        $query = User::query()->with('roles');

        // Corbeille : soft-deleted only
        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        // Filtres
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($role = $request->query('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }
        if ($deptId = $request->query('department')) {
            $query->whereHas('departments', fn ($q) => $q->where('departments.id', $deptId));
        }
        if ($request->has('baptized')) {
            $query->where('is_baptized', $request->boolean('baptized'));
        }

        // Tri
        $sort = (string) $request->query('sort', 'created_at');
        $allowedSort = ['created_at', 'name', 'email', 'status', 'joined_at'];
        if (! in_array($sort, $allowedSort, true)) $sort = 'created_at';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        return AdminMemberResource::collection($query->paginate($perPage));
    }

    /** Détail d'un membre avec ses départements, cellules et total dons. */
    public function show(int $id): AdminMemberResource
    {
        $user = User::withTrashed()
            ->with(['roles', 'departments', 'cells', 'donations' => fn ($q) => $q->where('status', 'completed')])
            ->findOrFail($id);

        return new AdminMemberResource($user);
    }

    /** Création d'un membre. */
    public function store(StoreMemberRequest $request): AdminMemberResource
    {
        $data = $request->validated();

        // Mot de passe : si fourni on hash, sinon on génère un random temporaire.
        $plainPassword = $data['password'] ?? Str::password(16);

        $user = DB::transaction(function () use ($data, $plainPassword) {
            $user = User::create([
                'first_name'  => $data['first_name'],
                'name'        => $data['name'],
                'email'       => strtolower($data['email']),
                'password'    => Hash::make($plainPassword),
                'phone'       => $data['phone'] ?? null,
                'gender'      => $data['gender'] ?? null,
                'birth_date'  => $data['birth_date'] ?? null,
                'city'        => $data['city'] ?? null,
                'address'     => $data['address'] ?? null,
                'is_baptized' => $data['is_baptized'] ?? false,
                'joined_at'   => $data['joined_at'] ?? now()->toDateString(),
                'status'      => $data['status'] ?? 'active',
            ]);

            // Rôles : par défaut "membre".
            $user->syncRoles($data['roles'] ?? ['membre']);

            // Départements (pivot) : éventuellement attribués dès la création.
            if (! empty($data['departments'])) {
                $now = now();
                $user->departments()->attach(
                    collect($data['departments'])
                        ->mapWithKeys(fn ($id) => [$id => ['role' => 'member', 'joined_at' => $now]])
                        ->all()
                );
            }
            return $user;
        });

        // TODO Phase 8 : envoi email d'invitation avec lien de reset password
        // si l'admin n'a pas fourni de mot de passe.

        return new AdminMemberResource(
            $user->load(['roles', 'departments', 'cells'])
        );
    }

    /** Modification. */
    public function update(UpdateMemberRequest $request, int $id): AdminMemberResource
    {
        $user = User::findOrFail($id);
        $data = $request->validated();

        // Si l'admin reset le mot de passe : on hash + on révoque tous les tokens existants.
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
            $user->tokens()->delete();
        }

        $user->fill($data)->save();

        return new AdminMemberResource(
            $user->fresh(['roles', 'departments', 'cells'])
        );
    }

    /** Suppression soft. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete members')) {
            abort(403);
        }
        if ($id === $request->user()->id) {
            return response()->json(['message' => 'Impossible de se supprimer soi-même.'], 422);
        }

        $user = User::findOrFail($id);

        // Sécurité : un admin ne peut pas supprimer un superadmin/pasteur.
        if ($user->hasAnyRole(['superadmin', 'pasteur'])
            && ! $request->user()->hasAnyRole(['superadmin', 'pasteur'])) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer ce compte.'], 403);
        }

        // Révoque tous ses tokens et le supprime (soft).
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Membre supprimé (archivé).']);
    }

    /** Restauration d'un membre soft-deleted. */
    public function restore(int $id): JsonResponse
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->restore();
        return response()->json(['message' => 'Membre restauré.']);
    }

    /** Synchronisation des rôles d'un membre. */
    public function assignRoles(AssignRolesRequest $request, int $id): AdminMemberResource
    {
        $user = User::findOrFail($id);
        $user->syncRoles($request->validated('roles'));

        return new AdminMemberResource($user->fresh('roles'));
    }

    /**
     * Export Excel des membres (avec filtres préservés).
     */
    public function export(Request $request)
    {
        if (! $request->user()->can('export members')) abort(403);

        $filename = 'membres-nwc-'.now()->format('Y-m-d_His').'.xlsx';
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\MembersExport($request->only(['search', 'status', 'role'])),
            $filename
        );
    }
}
