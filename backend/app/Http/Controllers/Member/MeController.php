<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Http\Requests\Member\ChangePasswordRequest;
use App\Http\Requests\Member\UpdateProfileRequest;
use App\Http\Requests\Member\UploadAvatarRequest;
use App\Http\Resources\UserResource;
use App\Jobs\ProcessAvatarJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Contrôleur "Mon Espace" — gestion du profil par le membre lui-même.
 *
 *  GET    /api/me                  → profil + rôles + permissions
 *  PUT    /api/me                  → mise à jour profil
 *  PUT    /api/me/password         → changement mot de passe
 *  POST   /api/me/avatar           → upload avatar (queue le traitement)
 *  DELETE /api/me/avatar           → suppression avatar
 */
class MeController extends Controller
{
    /** Profil de l'utilisateur connecté. */
    public function show(Request $request): UserResource
    {
        return new UserResource(
            $request->user()->load(['roles', 'permissions'])
        );
    }

    /** Mise à jour du profil (sauf email + password — endpoints dédiés). */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $user->fill($request->validated())->save();

        return new UserResource($user->fresh()->load('roles'));
    }

    /**
     * Changement de mot de passe (avec vérification du mot de passe actuel).
     *
     * Robustesse : sépare l'update DB (critique) du token-cleanup (non critique).
     *  - Si update fail → 500 clair, mdp non changé, user peut retenter.
     *  - Si update OK mais token-cleanup fail → 200 quand même (mdp changé,
     *    on ne veut PAS que le user soit bloqué à cause d'un warning sur
     *    Sanctum TransientToken qui n'a pas de propriété `id`).
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        try {
            $user->update([
                'password'             => Hash::make($request->validated('password')),
                'must_change_password' => false, // lève le verrou première-connexion
            ]);
        } catch (\Throwable $e) {
            \Log::error('Password change (update) failed', [
                'user_id' => $user->id, 'err' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Impossible de mettre à jour le mot de passe. Réessaie.',
            ], 500);
        }

        // À ce point, le mdp EST changé en DB. Ce qui suit est non-critique :
        // révocation des autres tokens actifs pour forcer la reconnexion partout
        // sauf sur la session courante.
        //
        // ⚠️  currentAccessToken() peut retourner un TransientToken (Sanctum SPA
        // cookie) qui n'a PAS de propriété `id`. Accéder à `->id` déclencherait
        // un warning promu en exception → 500 après update réussi = user bloqué.
        try {
            $current = $user->currentAccessToken();
            $currentId = ($current && is_object($current)) ? ($current->id ?? null) : null;
            if ($currentId) {
                $user->tokens()->where('id', '!=', $currentId)->delete();
            }
        } catch (\Throwable $tokenErr) {
            \Log::warning('Token cleanup after password change failed (non-blocking)', [
                'user_id' => $user->id, 'err' => $tokenErr->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }

    /**
     * Upload d'avatar.
     *
     * On stocke le fichier original dans un dossier temporaire,
     * puis on délègue à ProcessAvatarJob (queue) pour le redimensionnement
     * et la conversion WebP. Cela rend la requête HTTP rapide même avec
     * une image lourde, et permet de scaler horizontalement les workers.
     */
    public function uploadAvatar(UploadAvatarRequest $request): JsonResponse
    {
        $user = $request->user();
        $file = $request->file('avatar');

        // Stocke l'original dans tmp-uploads/ (auto-nettoyé par le job).
        $tempPath = $file->store('tmp-uploads', config('filesystems.default'));

        // Dispatch en queue (réponse HTTP immédiate).
        ProcessAvatarJob::dispatch(
            userId: $user->id,
            tempPath: $tempPath,
            oldAvatarPath: $user->avatar,
        );

        return response()->json([
            'message' => 'Avatar reçu. Il sera disponible dans quelques secondes.',
            'queued'  => true,
        ], 202); // 202 Accepted = bien reçu, traitement asynchrone
    }

    /** Suppression de l'avatar. */
    public function deleteAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->avatar && ! str_starts_with($user->avatar, 'http')) {
            Storage::disk(config('filesystems.default'))->delete($user->avatar);
        }
        $user->update(['avatar' => null]);

        return response()->json(['message' => 'Avatar supprimé.']);
    }

    /**
     * Étape F — Missions billetterie actives du user connecté.
     *
     * Retourne la liste des grants event_staff non révoqués + les infos event
     * pour alimenter le panneau "Mes missions" sur le tableau de bord perso.
     *
     * Filtre : events dont la fin (ends_at ou starts_at + 6h) est encore future
     * ou dans les 24h passées (fenêtre utile).
     */
    public function staffAssignments(Request $request): JsonResponse
    {
        $user = $request->user();

        // Seuil : on cache les events terminés depuis > 24h (grants auto-révoqués).
        $cutoff = now()->subHours(24);

        $rows = \App\Models\EventStaff::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->with(['event' => function ($q) use ($cutoff) {
                $q->select('id', 'title', 'slug', 'starts_at', 'ends_at', 'location', 'cover_image');
            }])
            ->get()
            ->filter(function ($r) use ($cutoff) {
                if (! $r->event) return false;
                $endsAt = $r->event->ends_at ?: ($r->event->starts_at ? $r->event->starts_at->copy()->addHours(6) : null);
                return $endsAt === null || $endsAt->gt($cutoff);
            })
            ->values();

        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        return response()->json([
            'assignments' => $rows->map(function ($r) use ($frontend) {
                // Étape F — URL SCOPÉE à cet event uniquement (hors AdminLayout).
                // Un gouverneur/leader/membre avec grant manager n'aura PAS accès
                // aux autres sections admin en passant par ce lien.
                [$actionUrl, $actionLabel] = match ($r->grant) {
                    'manager', 'scanner_lead' => [
                        $frontend . '/mission/evenement/' . $r->event_id,
                        $r->grant === 'manager' ? 'Gérer la billetterie' : 'Panneau Staff',
                    ],
                    default => [
                        $frontend . '/scan?event=' . $r->event_id,
                        'Ouvrir le scanner',
                    ],
                };

                return [
                    'id'          => $r->id,
                    'grant'       => $r->grant,
                    'event_id'    => $r->event_id,
                    'assigned_at' => $r->assigned_at?->toIso8601String(),
                    'action_url'  => $actionUrl,
                    'action_label'=> $actionLabel,
                    'event' => [
                        'id'          => $r->event->id,
                        'title'       => $r->event->title,
                        'slug'        => $r->event->slug,
                        'starts_at'   => $r->event->starts_at?->toIso8601String(),
                        'ends_at'     => $r->event->ends_at?->toIso8601String(),
                        'location'    => $r->event->location,
                        'cover_image' => $r->event->cover_image,
                    ],
                ];
            }),
        ]);
    }
}
