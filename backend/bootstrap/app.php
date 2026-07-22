<?php

/**
 * ==============================================================
 *  NEW WINE CHURCH — Bootstrap de l'application Laravel
 *  - Active le routage API (routes/api.php) sous le préfixe /api
 *  - Active Sanctum pour l'authentification stateful SPA
 *  - Configure les renderings d'exceptions en JSON pour les routes API
 * ==============================================================
 */

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        // Routes API (préfixe /api automatique).
        api: __DIR__.'/../routes/api.php',
        // Routes web classiques (Telescope, Horizon, etc.).
        web: __DIR__.'/../routes/web.php',
        // Commandes Artisan custom.
        commands: __DIR__.'/../routes/console.php',
        // Channels broadcast WebSocket.
        channels: __DIR__.'/../routes/channels.php',
        // Endpoint /up pour healthcheck.
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Active Sanctum pour les requêtes provenant du frontend SPA.
        // Permet d'utiliser les cookies HTTP-only au lieu de tokens Bearer.
        $middleware->statefulApi();

        // Alias des middlewares utilisés par Spatie Permission + middlewares NWC.
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            // Espace gouverneur / leader (Étape 2).
            'governor'    => \App\Http\Middleware\GovernorMiddleware::class,
            'cell-leader' => \App\Http\Middleware\CellLeaderMiddleware::class,
            // Force changement du mot de passe initial (workflow admission).
            'force-pwd-change' => \App\Http\Middleware\EnforcePasswordChange::class,
        ]);

        // Applique force-pwd-change à TOUTES les routes API auth:sanctum.
        // La whitelist interne du middleware autorise /me et /me/password.
        $middleware->appendToGroup('api', \App\Http\Middleware\EnforcePasswordChange::class);

        // Routes publiques exclues du CSRF token check.
        // Nécessaire pour les endpoints POST publics qui n'ont pas de session
        // stateful côté client (ex: vote public via QR code depuis un tel).
        $middleware->validateCsrfTokens(except: [
            'api/public/events/*/bal/vote',
            'api/public/enrollment/bal',
        ]);

        // Lit Accept-Language envoyé par axios → règle app()->getLocale() (fr/en).
        // Les Models utilisent ensuite cette locale pour renvoyer name_en si EN.
        $middleware->prependToGroup('api', \App\Http\Middleware\SetLocaleFromHeader::class);

        // En-têtes de sécurité HTTP (CSP, HSTS, X-Frame-Options…) sur TOUTES
        // les réponses (api + web). Append pour s'exécuter en dernier.
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Toute exception sur une route /api/* renvoie du JSON propre,
        // jamais une vue HTML d'erreur (le frontend SPA s'en occupe).
        $exceptions->shouldRenderJsonWhen(function (Request $request, \Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Sentry : capture toutes les exceptions non gérées en prod.
        // Le DSN dans .env active ou non (sentry/sentry-laravel ignore si absent).
        $exceptions->report(function (\Throwable $e) {
            if (app()->bound('sentry')) {
                app('sentry')->captureException($e);
            }
        });
    })->create();
