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
use App\Models\Event as EventModel;
use App\Models\GovernorProfile;
use App\Observers\EventObserver;
use App\Policies\EventPolicy;
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
        // Telescope (debug) : DEV uniquement. La classe parente
        // TelescopeApplicationServiceProvider est en `require-dev` → absente en
        // prod après `composer install --no-dev`. On enregistre le SP local
        // SEULEMENT si le package est installé, sinon Laravel le saute.
        if (class_exists(\Laravel\Telescope\TelescopeApplicationServiceProvider::class)) {
            $this->app->register(\App\Providers\TelescopeServiceProvider::class);
        }
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

        // Policy Event : enregistrement explicite (garantit la découverte
        // indépendamment de l'auto-discovery Laravel).
        Gate::policy(EventModel::class, EventPolicy::class);

        // === Observers ===
        // EventObserver — auto-attribution des grants event_staff + notif admin.
        EventModel::observe(EventObserver::class);

        // Notifications in-app pour l'activité admin (Étape G).
        // Chaque observer envoie un `AppActivityNotification` scopé aux bons
        // destinataires (RH pour membres, pasteur pour prières, etc.).
        \App\Models\User::observe(\App\Observers\UserActivityObserver::class);
        \App\Models\MembershipRequest::observe(\App\Observers\MembershipRequestObserver::class);
        \App\Models\Donation::observe(\App\Observers\DonationObserver::class);
        \App\Models\PrayerRequest::observe(\App\Observers\PrayerRequestObserver::class);
        \App\Models\ContactMessage::observe(\App\Observers\ContactMessageObserver::class);
        \App\Models\Testimonial::observe(\App\Observers\TestimonialObserver::class);

        // Sprint B — #4 Alerte waitlist billetterie.
        \App\Models\EventTicketWaitlist::observe(\App\Observers\EventTicketWaitlistObserver::class);

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

        // === Politique de mot de passe ===
        // 8 caractères mini + majuscule + minuscule + chiffre + symbole.
        // Alignée entre dev et prod pour éviter le "marche en local, pas en prod".
        //
        // On N'active PAS uncompromised() (check HaveIBeenPwned) :
        //  - dépendance réseau fragile (throw imprévisible depuis Hostinger)
        //  - trop de faux positifs sur des motifs communs pour un contexte
        //    église (Prénom+année+!) → friction UX qui n'améliore pas la
        //    sécurité (le user reprend un autre motif tout aussi commun).
        Password::defaults(fn () =>
            Password::min(8)
                ->mixedCase()
                ->numbers()
                ->symbols()
        );

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

        // Inscription billetterie : 3 par 10 min ET 6 tickets max / heure / IP.
        // Sécurité #H5 audit : anciennement seulement "3 inscriptions" mais chaque
        // inscription = jusqu'à 3 tickets → 9 places/IP/10min = DoS event.
        RateLimiter::for('public-register', function (Request $request) {
            $qty = max(1, (int) $request->input('quantity', 1));
            return [
                Limit::perMinutes(10, 3)->by($request->ip()),
                // Ticket-quantity budget : accumule tickets pris récemment.
                Limit::perMinutes(60, 6)->by($request->ip().'|qty|'.$qty),
            ];
        });

        // Sécurité #H6 audit : lecture du ticket via token public (mon-ticket).
        // 30/min = tolérant pour l'user qui refresh, mais bloque un scan brute-force.
        RateLimiter::for('ticket-view', fn (Request $request) =>
            Limit::perMinute(30)->by($request->ip())
        );

        // Sécurité #H6 audit : cancel via token public.
        // Action sensible (annule le ticket) → limite drastique 5/heure.
        RateLimiter::for('ticket-cancel', fn (Request $request) =>
            Limit::perHour(5)->by($request->ip())
        );

        // Sécurité #H7 audit : scan tickets (short_code) — évite brute-force
        // des NWC-XXXX (~1M combos possible). 60/min = agents de sécu OK,
        // attaquant bloqué après 60 tentatives/min.
        RateLimiter::for('ticket-scan', fn (Request $request) =>
            Limit::perMinute(60)->by(
                optional($request->user())->id ?? $request->ip()
            )
        );
    }
}
