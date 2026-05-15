<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Si l'utilisateur a `must_change_password=true`, on bloque l'accès aux endpoints
 * sauf ceux explicitement autorisés (logout, changement mdp, fetch /me).
 *
 * Renvoie HTTP 423 (Locked) avec un payload `must_change_password=true` que le
 * frontend détecte pour forcer la redirection vers /changer-mot-de-passe.
 */
class EnforcePasswordChange
{
    /** Routes autorisées même quand un changement de mdp est requis. */
    protected array $whitelist = [
        'api/me',                      // GET /me pour bootstrap auth
        'api/me/password',             // PUT /me/password (changement)
        'api/auth/logout',
        'api/auth/logout-all',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->must_change_password) {
            return $next($request);
        }

        $path = trim($request->path(), '/');
        foreach ($this->whitelist as $allowed) {
            if ($path === $allowed) {
                return $next($request);
            }
        }

        return response()->json([
            'message'              => 'Vous devez changer votre mot de passe avant de continuer.',
            'must_change_password' => true,
        ], 423);
    }
}
