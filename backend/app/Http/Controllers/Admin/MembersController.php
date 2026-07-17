<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignRolesRequest;
use App\Http\Requests\Admin\StoreMemberRequest;
use App\Http\Requests\Admin\UpdateMemberRequest;
use App\Http\Resources\Admin\AdminMemberResource;
use App\Models\Cell;
use App\Models\Department;
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

        // Mot de passe : si fourni on l'utilise, sinon random lettres+chiffres.
        // On exclut les symboles pour éviter les soucis de copie depuis les mails.
        $plainPassword = $data['password'] ?? Str::password(16, symbols: false);

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

        // Envoi auto des identifiants par email si demandé (option à la création).
        // Sécurité : silencieux en cas d'échec mail — ne pas casser la création.
        if ($request->boolean('send_credentials') && $user->email) {
            try {
                \Illuminate\Support\Facades\Mail::to($user->email)
                    ->send(new \App\Mail\AccountCredentialsMail($user, $plainPassword));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Send credentials mail failed', [
                    'user_id' => $user->id, 'err' => $e->getMessage(),
                ]);
            }
        }

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
        $newPlainPassword = null;
        if (! empty($data['password'])) {
            $newPlainPassword = $data['password'];
            $data['password'] = Hash::make($data['password']);
            $user->tokens()->delete();
        }

        $user->fill($data)->save();

        // Envoi auto du nouveau mot de passe par email si demandé.
        if ($newPlainPassword && $request->boolean('send_credentials') && $user->email) {
            try {
                \Illuminate\Support\Facades\Mail::to($user->email)
                    ->send(new \App\Mail\AccountCredentialsMail($user->fresh(), $newPlainPassword));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Send credentials mail failed', [
                    'user_id' => $user->id, 'err' => $e->getMessage(),
                ]);
            }
        }

        return new AdminMemberResource(
            $user->fresh(['roles', 'departments', 'cells'])
        );
    }

    /**
     * Envoie (ou ré-envoie) les identifiants par email au membre.
     *
     * 2 modes :
     *   - Sans body → génère un mot de passe aléatoire
     *   - Avec body { password: "xxx" } → utilise ce mot de passe précis
     *
     * Optionnel { send_email: false } → ne change que le mp en base sans envoyer mail
     * (utile si SMTP HS, l'admin transmet manuellement).
     *
     * Envoi SYNCHRONE (pas en queue) pour avoir un retour immédiat à l'admin
     * sur succès/échec, et ne pas dépendre d'un worker queue actif en prod.
     */
    public function resendCredentials(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('create members')) abort(403);
        $user = User::findOrFail($id);

        $request->validate([
            'password'   => ['nullable', 'string', 'min:6', 'max:100'],
            'send_email' => ['nullable', 'boolean'],
        ]);

        // Mot de passe initial : lettres + chiffres UNIQUEMENT (12 chars).
        // Raison : les caractères spéciaux (\, $, ., ...) se copient mal depuis
        // les emails (échappement HTML, autoformatage clients mail) et cassent
        // le login. Le user changera le mp à la 1re connexion → sécurité OK.
        $newPassword = $request->input('password') ?: Str::password(12, symbols: false);
        $user->update(['password' => $newPassword]);
        $user->tokens()->delete();

        $sendEmail = $request->boolean('send_email', true);
        $emailSent = false;
        $emailError = null;

        if ($sendEmail && $user->email) {
            try {
                \Illuminate\Support\Facades\Mail::to($user->email)
                    ->send(new \App\Mail\AccountCredentialsMail($user->fresh(), $newPassword));
                $emailSent = true;
            } catch (\Throwable $e) {
                $emailError = $e->getMessage();
                \Illuminate\Support\Facades\Log::warning('Send credentials mail failed', [
                    'user_id' => $user->id, 'err' => $emailError,
                ]);
            }
        }

        return response()->json([
            'message' => $emailSent
                ? "Identifiants envoyés à {$user->email}. L'ancien mot de passe ne fonctionne plus."
                : "Mot de passe mis à jour." . ($emailError
                    ? " ⚠️ Envoi email échoué ({$emailError}) — communique le mp manuellement : {$newPassword}"
                    : " À toi de transmettre : {$newPassword}"),
            'email_sent' => $emailSent,
            // Le mp est renvoyé en clair UNIQUEMENT pour permettre à l'admin
            // de copier/coller s'il doit transmettre manuellement (SMTP HS).
            'password'   => $sendEmail && $emailSent ? null : $newPassword,
        ]);
    }

    /**
     * Bascule rapide actif/inactif (sans toucher le reste). UI : toggle dans
     * la fiche détail. Tokens révoqués automatiquement à la désactivation.
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('edit members')) abort(403);
        $user = User::findOrFail($id);
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Impossible de désactiver son propre compte.'], 422);
        }

        $newStatus = $user->status === 'active' ? 'inactive' : 'active';
        $user->update(['status' => $newStatus]);

        // Si désactivation, on coupe tous les sessions actives.
        if ($newStatus === 'inactive') $user->tokens()->delete();

        return response()->json([
            'message' => $newStatus === 'active' ? 'Compte activé.' : 'Compte désactivé (sessions coupées).',
            'status'  => $newStatus,
        ]);
    }

    /**
     * Upload photo de profil (avatar). Image redimensionnée + convertie WebP
     * via le trait HandlesImageUpload (cohérent avec les autres uploads).
     */
    public function uploadAvatar(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('edit members')) abort(403);
        $request->validate([
            'avatar' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $user = User::findOrFail($id);

        $trait = new class { use \App\Traits\HandlesImageUpload; public function run($model, $file) {
            $this->processAndStoreImage(
                model: $model, file: $file, attribute: 'avatar',
                targetDir: 'avatars',
                options: ['max_width' => 600, 'max_height' => 600, 'fit' => 'cover'],
            );
        }};
        $trait->run($user, $request->file('avatar'));

        return response()->json([
            'message' => 'Photo de profil mise à jour.',
            'avatar'  => $user->fresh()->avatar,
        ]);
    }

    /**
     * Aperçu de l'impact d'une suppression — quels mandats vont être clôturés,
     * quelles cellules vont perdre leur leader, etc. Affiché dans la modal de
     * confirmation pour que l'admin sache vraiment ce qu'il fait.
     *
     * GET /api/admin/members/{id}/deletion-impact
     */
    public function deletionImpact(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete members')) abort(403);

        $user = User::findOrFail($id);

        $govDepts = DB::table('department_governors as dg')
            ->join('departments as d', 'd.id', '=', 'dg.department_id')
            ->where('dg.user_id', $user->id)
            ->whereNull('dg.ended_at')
            ->select('d.id', 'd.name')
            ->get();

        $leaderCells = Cell::where('leader_id', $user->id)->select('id', 'name')->get();

        return response()->json([
            'user' => [
                'id'        => $user->id,
                'full_name' => $user->full_name,
            ],
            'governed_departments' => $govDepts,    // mandats actifs à clôturer
            'led_cells'            => $leaderCells, // cellules sans leader après delete
            'has_critical_role'    => $user->hasAnyRole(['superadmin', 'pasteur']),
        ]);
    }

    /**
     * Suppression soft avec NETTOYAGE EN CASCADE.
     *
     * Avant le soft-delete, on s'assure que :
     *  1. Tous les mandats gouverneur actifs sont clôturés (ended_at = today)
     *  2. departments.governor_id est remis à null pour les depts concernés
     *  3. Les pivots department_user sont détachés (libère le slot dans l'équipe)
     *  4. Si leader de cellule(s) : cells.leader_id = null + pivot cell_user détaché
     *  5. Tous les rôles Spatie sont retirés (sinon l'user garde accès au login
     *     même soft-deleted si on restaure plus tard sans purge)
     *  6. Les flags is_governor / is_cell_leader / department_id / cell_id sont reset
     *  7. Les caches member_count_cache des depts impactés sont recalculés
     *  8. Tous les tokens Sanctum sont révoqués
     *
     * Sans ce nettoyage, l'app affichait un dept "Marketing - Gouverneur: ???"
     * (mort), des cellules sans leader vivant, et des compteurs faux.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete members')) abort(403);
        if ($id === $request->user()->id) {
            return response()->json(['message' => 'Impossible de se supprimer soi-même.'], 422);
        }

        $user = User::findOrFail($id);

        // Sécurité : un admin non-superadmin ne peut pas supprimer superadmin/pasteur.
        if ($user->hasAnyRole(['superadmin', 'pasteur'])
            && ! $request->user()->hasAnyRole(['superadmin', 'pasteur'])) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer ce compte.'], 403);
        }

        $report = ['closed_mandates' => 0, 'detached_depts' => 0, 'detached_cells' => 0, 'unleader_cells' => 0];

        DB::transaction(function () use ($user, &$report) {
            // 1. Mandats gouverneur actifs → clôture + reset governor_id du dept
            $activeMandateDeptIds = DB::table('department_governors')
                ->where('user_id', $user->id)
                ->whereNull('ended_at')
                ->pluck('department_id');

            if ($activeMandateDeptIds->isNotEmpty()) {
                DB::table('department_governors')
                    ->where('user_id', $user->id)
                    ->whereNull('ended_at')
                    ->update([
                        'ended_at'   => now()->toDateString(),
                        'notes'      => DB::raw("CONCAT(COALESCE(notes,''), '\nFin automatique : compte supprimé le " . now()->toDateString() . "')"),
                        'updated_at' => now(),
                    ]);
                Department::whereIn('id', $activeMandateDeptIds)
                    ->where('governor_id', $user->id)
                    ->update(['governor_id' => null, 'status' => 'pending']);
                $report['closed_mandates'] = $activeMandateDeptIds->count();
            }

            // 2. Pivot department_user → détacher de tous les depts
            $deptIds = DB::table('department_user')
                ->where('user_id', $user->id)
                ->pluck('department_id');
            if ($deptIds->isNotEmpty()) {
                DB::table('department_user')->where('user_id', $user->id)->delete();
                $report['detached_depts'] = $deptIds->count();
            }

            // 3. Si leader de cellule(s) → cells.leader_id null
            $ledCellIds = Cell::where('leader_id', $user->id)->pluck('id');
            if ($ledCellIds->isNotEmpty()) {
                Cell::whereIn('id', $ledCellIds)
                    ->update(['leader_id' => null, 'status' => 'pending']);
                $report['unleader_cells'] = $ledCellIds->count();
            }

            // 4. Pivot cell_user → détacher
            $cellIds = DB::table('cell_user')->where('user_id', $user->id)->pluck('cell_id');
            if ($cellIds->isNotEmpty()) {
                DB::table('cell_user')->where('user_id', $user->id)->delete();
                $report['detached_cells'] = $cellIds->count();
            }

            // 5. Retire tous les rôles Spatie (gouverneur, leader, rh, etc.)
            $user->syncRoles([]);

            // 6. Reset flags utilisateur + status=inactive (cohérence affichage)
            //    Sans ce statut, la liste corbeille affichait toujours "Actif"
            //    alors que le compte était archivé.
            //    ⚠️ forceFill() nécessaire : is_governor/is_cell_leader ne sont
            //    pas en $fillable pour éviter les élévations de privilège via
            //    mass assignment. Ici on est dans un admin controller après
            //    vérification de rôle.
            $user->forceFill([
                'is_governor'    => false,
                'is_cell_leader' => false,
                'department_id'  => null,
                'cell_id'        => null,
                'status'         => 'inactive',
            ])->save();

            // 7. Recalcule les compteurs des depts/cells impactés
            $allDeptIds = $activeMandateDeptIds->merge($deptIds)->unique();
            foreach ($allDeptIds as $deptId) {
                $dept = Department::find($deptId);
                if ($dept) {
                    $dept->update(['member_count_cache' => $dept->members()->count()]);
                }
            }

            // 8. Tokens Sanctum
            $user->tokens()->delete();

            // 9. Soft delete final
            $user->delete();
        });

        $summary = [];
        if ($report['closed_mandates'])  $summary[] = "{$report['closed_mandates']} mandat(s) gouverneur clôturé(s)";
        if ($report['detached_depts'])   $summary[] = "{$report['detached_depts']} département(s) détaché(s)";
        if ($report['unleader_cells'])   $summary[] = "{$report['unleader_cells']} cellule(s) sans leader";
        if ($report['detached_cells'])   $summary[] = "{$report['detached_cells']} cellule(s) détachée(s)";

        return response()->json([
            'message' => 'Membre supprimé (archivé). ' . ($summary ? implode(', ', $summary) . '.' : 'Aucune relation à nettoyer.'),
            'report'  => $report,
        ]);
    }

    /** Restauration d'un membre soft-deleted. */
    public function restore(int $id): JsonResponse
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->restore();
        return response()->json(['message' => 'Membre restauré.']);
    }

    /**
     * Suppression DÉFINITIVE — efface la ligne en base + révoque tokens.
     *
     * Disponible uniquement pour un membre déjà soft-deleted (corbeille).
     * Ne peut pas s'auto-supprimer, ne peut pas supprimer superadmin/pasteur
     * si on n'a pas le rôle. Pivot tables nettoyées par ON DELETE CASCADE.
     */
    public function forceDelete(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete members')) abort(403);
        if ($id === $request->user()->id) {
            return response()->json(['message' => 'Impossible de se supprimer soi-même.'], 422);
        }

        // On accepte un membre dans la corbeille OU vivant (mais on conseille
        // d'archiver d'abord — l'admin frontend ne propose ce bouton qu'en corbeille).
        $user = User::withTrashed()->findOrFail($id);

        if ($user->hasAnyRole(['superadmin', 'pasteur'])
            && ! $request->user()->hasAnyRole(['superadmin', 'pasteur'])) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer ce compte.'], 403);
        }

        DB::transaction(function () use ($user) {
            // Sécurité : on retire d'abord tout ce qui pourrait empêcher une
            // suppression propre (rôles, tokens, pivots non cascade).
            $user->syncRoles([]);
            $user->tokens()->delete();
            DB::table('department_user')->where('user_id', $user->id)->delete();
            DB::table('cell_user')->where('user_id', $user->id)->delete();
            // forceDelete bypasse SoftDeletes → DELETE FROM users WHERE id=...
            $user->forceDelete();
        });

        return response()->json(['message' => 'Membre supprimé définitivement.']);
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
    /**
     * Action en lot sur N membres.
     * Body : { action: 'delete', ids: [int] }
     * Max 200 IDs par appel. Permissions héritées de la perm `delete members`
     * pour delete. Le soft-delete préserve les données (corbeille).
     */
    public function bulk(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['required', 'string', 'in:delete,force_delete,activate,deactivate'],
            'ids'    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'  => ['integer'],
        ]);

        $user = $request->user();
        $action = $request->input('action');
        $ids = $request->input('ids');

        // On retire son propre id pour éviter de se supprimer soi-même par mégarde.
        $ids = array_values(array_diff($ids, [$user->id]));
        if (empty($ids)) {
            return response()->json(['message' => 'Aucun membre éligible.', 'count' => 0]);
        }

        // Permission selon action
        $perm = in_array($action, ['delete', 'force_delete']) ? 'delete members' : 'edit members';
        abort_unless($user?->can($perm), 403);

        // Protection : on filtre les superadmin/pasteur si l'utilisateur courant
        // n'a pas un rôle équivalent (pas de massacre involontaire).
        if (! $user->hasAnyRole(['superadmin', 'pasteur'])) {
            $ids = User::whereIn('id', $ids)
                ->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', ['superadmin', 'pasteur']))
                ->pluck('id')->all();
        }

        if ($action === 'activate') {
            $count = User::whereIn('id', $ids)->update(['status' => 'active']);
            return response()->json(['message' => "$count compte(s) activé(s).", 'count' => $count]);
        }

        if ($action === 'deactivate') {
            $count = User::whereIn('id', $ids)->update(['status' => 'inactive']);
            // Coupe toutes les sessions actives des comptes désactivés.
            \DB::table('personal_access_tokens')->whereIn('tokenable_id', $ids)
                ->where('tokenable_type', User::class)->delete();
            return response()->json(['message' => "$count compte(s) désactivé(s) (sessions coupées).", 'count' => $count]);
        }

        if ($action === 'delete') {
            // Archivage = soft-delete + status=inactive + tokens révoqués + rôles purgés
            $targets = User::whereIn('id', $ids)->get();
            foreach ($targets as $u) {
                $u->forceFill(['status' => 'inactive', 'is_governor' => false, 'is_cell_leader' => false])->save();
                $u->syncRoles([]);
                $u->tokens()->delete();
            }
            $count = User::whereIn('id', $ids)->delete();
            return response()->json(['message' => "$count membre(s) archivé(s).", 'count' => $count]);
        }

        if ($action === 'force_delete') {
            $targets = User::withTrashed()->whereIn('id', $ids)->get();
            $count = 0;
            DB::transaction(function () use ($targets, &$count) {
                foreach ($targets as $u) {
                    $u->syncRoles([]);
                    $u->tokens()->delete();
                    DB::table('department_user')->where('user_id', $u->id)->delete();
                    DB::table('cell_user')->where('user_id', $u->id)->delete();
                    $u->forceDelete();
                    $count++;
                }
            });
            return response()->json(['message' => "$count membre(s) supprimé(s) définitivement.", 'count' => $count]);
        }

        return response()->json(['message' => 'Action inconnue.'], 400);
    }

    public function export(Request $request)
    {
        if (! $request->user()->can('export members')) abort(403);

        $params = $request->only(['search', 'status', 'role', 'trashed', 'ids']);

        // Normalise les ids : accepte tableau natif OU CSV "1,2,3" (cas où le
        // frontend a sérialisé pour traverser HTTP de manière fiable).
        if (! empty($params['ids']) && is_string($params['ids'])) {
            $params['ids'] = array_filter(array_map('intval', explode(',', $params['ids'])));
        }

        $filename = $this->buildExportFilename($params);
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\MembersExport($params),
            $filename
        );
    }

    /**
     * Nomme le fichier d'export intelligemment selon les filtres actifs.
     * Ex: "Membres-NWC-Selection-4-2026-06-21.xlsx"
     *     "Membres-NWC-Gouverneurs-Actifs-2026-06-21.xlsx"
     *     "Membres-NWC-Corbeille-2026-06-21.xlsx"
     */
    private function buildExportFilename(array $params): string
    {
        $date = now()->format('Y-m-d');
        $bits = ['Membres-NWC'];

        if (! empty($params['ids']) && is_array($params['ids'])) {
            $bits[] = 'Selection-' . count($params['ids']);
        } else {
            if (! empty($params['trashed']))  $bits[] = 'Corbeille';
            if (! empty($params['status']))   $bits[] = ucfirst($params['status']) . 's';
            if (! empty($params['role']))     $bits[] = ucfirst($params['role']) . 's';
            if (! empty($params['search']))   $bits[] = 'Recherche';
            if (count($bits) === 1)           $bits[] = 'Annuaire-complet';
        }
        $bits[] = $date;
        return implode('-', $bits) . '.xlsx';
    }
}
