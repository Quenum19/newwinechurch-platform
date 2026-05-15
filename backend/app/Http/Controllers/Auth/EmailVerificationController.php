<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Vérification de l'adresse email d'un membre.
 *
 *  - POST /api/auth/email/resend          → renvoyer le mail (auth requis)
 *  - GET  /api/auth/email/verify/{id}/{hash} → cliqué depuis l'email (signed URL)
 */
class EmailVerificationController extends Controller
{
    /**
     * Vérifie l'email via le lien signé reçu par mail.
     * Le middleware `signed` garantit l'intégrité de l'URL.
     */
    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        // Vérifie que le hash correspond bien à l'email actuel.
        if (! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return response()->json(['message' => 'Lien invalide.'], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email déjà vérifié.']);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return response()->json(['message' => 'Email vérifié avec succès.']);
    }

    /**
     * Renvoyer l'email de vérification (auth requis).
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email déjà vérifié.']);
        }
        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Email de vérification renvoyé.']);
    }
}
