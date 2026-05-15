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

    /** Changement de mot de passe (avec vérification du mot de passe actuel). */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update([
            'password'             => Hash::make($request->validated('password')),
            'must_change_password' => false, // lève le verrou première-connexion
        ]);

        // Sécurité : on révoque tous les autres tokens (sauf le courant) après changement.
        if ($current = $user->currentAccessToken()) {
            $user->tokens()->where('id', '!=', $current->id)->delete();
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
}
