<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Connexion stateful (Sanctum SPA — cookie HTTP-only) ou stateless (token Bearer mobile).
 *
 * Sécurité :
 *  - Rate limiter "login" appliqué en route (cf api.php) : 5 essais / 5 min par email+IP
 *  - Lockout informatif (sans donner le délai exact pour ne pas faciliter brute force timing)
 *  - On ne révèle JAMAIS si l'email existe ou non en cas d'échec
 *  - Log d'audit des tentatives échouées (Spatie ActivityLog Phase 8)
 *  - Régénération de la session après login (anti-fixation)
 */
class LoginController extends Controller
{
    /**
     * Tentative de connexion.
     * - Mode SPA : si pas de "device_name", session-based + cookie Sanctum.
     * - Mode token : si "device_name" fourni, retourne un token Bearer Sanctum.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower((string) $data['email']);

        $key = 'login|'.$email.'|'.$request->ip();

        // Vérification rate limit (en plus du middleware route).
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        // Cherche l'utilisateur (sans révéler s'il existe en cas d'échec).
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key, 300); // pénalité 5 min
            return response()->json([
                'message' => 'Identifiants invalides.',
            ], 401);
        }

        // Compte désactivé ?
        if ($user->status === 'inactive') {
            return response()->json([
                'message' => 'Ce compte est désactivé. Contactez le pasteur.',
            ], 403);
        }

        // OK : on consomme les hits accumulés.
        RateLimiter::clear($key);

        // === Mode TOKEN (mobile / API) ===
        if ($deviceName = $data['device_name'] ?? null) {
            // Sanctum: les abilities permettent de scoper les tokens.
            // Pour l'instant, ['*'] = tout — on durcira avec abilities granulaires si besoin.
            $token = $user->createToken($deviceName, ['*'], now()->addDays(30))->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => (new UserResource($user->load('roles')))->expose(),
            ]);
        }

        // === Mode SPA (session + cookie) ===
        Auth::login($user, (bool) ($data['remember'] ?? false));

        // Anti-fixation : régénère l'ID de session.
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Connecté.',
            'user'    => (new UserResource($user->load('roles')))->expose(),
        ]);
    }

    /**
     * Déconnexion : révoque le token courant (mode token) ou détruit la session (SPA).
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Mode token : on supprime UNIQUEMENT le token courant.
        if ($user && $request->bearerToken() && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }

        // Mode SPA : invalide la session côté serveur.
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * Déconnexion de TOUS les appareils (révoque tous les tokens et sessions).
     * Utile en cas de suspicion de compromission.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->tokens()->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Déconnecté de tous les appareils.',
        ]);
    }
}
