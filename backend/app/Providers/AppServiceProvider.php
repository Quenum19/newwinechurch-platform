<?php

namespace App\Providers;

use App\Events\CellLeaderAssigned;
use App\Events\CellReportReviewed;
use App\Events\CellReportSubmitted;
use App\Events\DepartmentReportReviewed;
use App\Events\DepartmentReportSubmitted;
use App\Events\GovernorAssigned;
use App\Listeners\LogReportActivity;
use App\Listeners\NotifyGovernorOnCellReport;
use App\Listeners\NotifyGovernorOnReportReviewed;
use App\Listeners\NotifyLeaderOnCellReportReviewed;
use App\Listeners\NotifyNewCellLeader;
use App\Listeners\NotifyNewGovernor;
use App\Listeners\NotifyPastorAndHR;
use App\Models\GovernorProfile;
use App\Policies\GovernorPolicy;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

/**
 * AppServiceProvider — boot global de l'application NWC.
 *
 * Responsabilités :
 *  - Garantit la longueur d'index sûre pour MySQL (utf8mb4 / 191 chars).
 *  - Force HTTPS pour les URL générées en production.
 */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // === Sécurité base de données ===
        // Évite l'erreur "Specified key was too long" sur anciennes versions MySQL.
        Schema::defaultStringLength(191);

        // === Policies hors auto-discovery ===
        // GovernorPolicy ne suit pas la convention {Model}Policy (le modèle
        // est GovernorProfile) — on l'enregistre explicitement.
        Gate::policy(GovernorProfile::class, GovernorPolicy::class);

        // === Étape 3 — Events / Listeners ===
        // En Laravel 11+ l'auto-discovery est possible via les annotations type,
        // mais on enregistre explicitement pour rester lisible et fiable.
        Event::listen(DepartmentReportSubmitted::class, [LogReportActivity::class, 'handle']);
        Event::listen(DepartmentReportSubmitted::class, [NotifyPastorAndHR::class,    'handle']);

        Event::listen(DepartmentReportReviewed::class,  [LogReportActivity::class,           'handle']);
        Event::listen(DepartmentReportReviewed::class,  [NotifyGovernorOnReportReviewed::class, 'handle']);

        Event::listen(CellReportSubmitted::class, [LogReportActivity::class,        'handle']);
        Event::listen(CellReportSubmitted::class, [NotifyGovernorOnCellReport::class,'handle']);

        Event::listen(CellReportReviewed::class,  [LogReportActivity::class,                  'handle']);
        Event::listen(CellReportReviewed::class,  [NotifyLeaderOnCellReportReviewed::class,   'handle']);

        Event::listen(GovernorAssigned::class,    [NotifyNewGovernor::class,   'handle']);
        Event::listen(CellLeaderAssigned::class,  [NotifyNewCellLeader::class, 'handle']);

        // === Sécurité production ===
        // Force HTTPS pour toutes les URL générées en prod (load balancer SSL).
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // === Politique de mot de passe stricte ===
        // 10 caractères mini, mixte, chiffres, symboles, non compromis.
        // En local on garde un peu de souplesse (8 chars + mixte) pour fluidifier les tests.
        Password::defaults(function () {
            $rule = Password::min($this->app->environment('production') ? 10 : 8)
                            ->mixedCase()
                            ->numbers()
                            ->symbols();
            return $this->app->environment('production') ? $rule->uncompromised() : $rule;
        });

        // === Rate limiters nommés (utilisés par les routes auth) ===

        // 5 tentatives de connexion par couple email+IP toutes les 5 min,
        // puis lockout 15 min. Évite le brute force tout en laissant l'UX souple.
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email', '');
            return [
                Limit::perMinutes(5, 5)->by(strtolower($email).'|'.$request->ip()),
                Limit::perMinutes(15, 20)->by($request->ip()), // garde-fou IP global
            ];
        });

        // 3 demandes de reset password par 15 min (anti-énumération + anti-spam mail).
        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinutes(15, 3)
                        ->by(strtolower((string) $request->input('email', '')).'|'.$request->ip());
        });

        // Inscriptions : 5 par heure par IP (anti-bot).
        RateLimiter::for('register', fn (Request $request) =>
            Limit::perHour(5)->by($request->ip())
        );

        // Upload avatar : 10 par jour par user (limite l'abus de stockage).
        RateLimiter::for('avatar-upload', fn (Request $request) =>
            Limit::perDay(10)->by(optional($request->user())->id ?? $request->ip())
        );
    }
}
