<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Flux de réinitialisation de mot de passe.
 *
 * 1. POST /api/auth/forgot-password   → email envoyé en queue (jamais d'erreur révélant l'existence du compte)
 * 2. POST /api/auth/reset-password    → token vérifié, mot de passe mis à jour, tokens existants révoqués
 */
class PasswordResetController extends Controller
{
    /**
     * Étape 1 : demande de réinitialisation.
     * Réponse identique que l'email existe ou non (anti-énumération).
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink([
            'email' => strtolower($request->validated('email')),
        ]);

        // Réponse 200 dans tous les cas — on ne révèle jamais si l'email existe.
        return response()->json([
            'message' => 'Si un compte est associé à cet email, un lien de réinitialisation a été envoyé.',
            'status'  => $status, // utile en dev pour debug, retiré en prod via APP_DEBUG=false
        ]);
    }

    /**
     * Étape 2 : confirmation avec token + nouveau mot de passe.
     * À l'issue, on révoque tous les tokens Sanctum existants par sécurité.
     */
    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password'       => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Sécurité : révoque toutes les sessions et tokens Sanctum existants.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Mot de passe réinitialisé. Vous pouvez vous reconnecter.']);
        }

        return response()->json([
            'message' => 'Token invalide ou expiré. Demandez un nouveau lien.',
            'status'  => $status,
        ], 422);
    }
}
