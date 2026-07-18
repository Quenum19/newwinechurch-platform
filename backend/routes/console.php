<?php

/**
 * NWC — Commandes Artisan custom + planification.
 *
 * Laravel 11+ : la planification se déclare ici via Schedule::job() ou
 * Schedule::command(). Le scheduler doit tourner via :
 *   `* * * * * php artisan schedule:run` (cron prod).
 */

use App\Jobs\CheckMissingCellReportsJob;
use App\Jobs\CheckOverdueReportsJob;
use App\Jobs\CleanupStorageAndLogsJob;
use App\Jobs\SendMonthlyBirthdaysListJob;
use App\Jobs\SendWeeklyDepartmentDigestJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Commande manuelle : génère + envoie la liste des anniversaires du mois.
// Utile pour tester sans attendre le 1er du mois.
Artisan::command('nwc:send-birthdays', function () {
    $this->info('Dispatch SendMonthlyBirthdaysListJob…');
    SendMonthlyBirthdaysListJob::dispatchSync();
    $this->info('Done.');
})->purpose('Génère et envoie la liste PDF des anniversaires du mois en cours à la RH');

// ============================================================
// === ÉTAPE 3 — Tâches planifiées Notifications ==============
// ============================================================

// Tous les jours à 8h00 : check des rapports département en retard.
Schedule::job(new CheckOverdueReportsJob())
    ->dailyAt('08:00')
    ->name('nwc:check-overdue-reports')
    ->onOneServer() // évite la double-exécution si plusieurs workers
    ->withoutOverlapping();

// Tous les lundis à 9h00 : check des cellules sans rapport hebdo.
Schedule::job(new CheckMissingCellReportsJob())
    ->weeklyOn(1, '09:00') // 1 = lundi
    ->name('nwc:check-missing-cell-reports')
    ->onOneServer()
    ->withoutOverlapping();

// Tous les vendredis à 17h : digest hebdomadaire pasteur + gouverneurs.
Schedule::job(new SendWeeklyDepartmentDigestJob())
    ->weeklyOn(5, '17:00') // 5 = vendredi
    ->name('nwc:weekly-digest')
    ->onOneServer()
    ->withoutOverlapping();

// Billetterie : rappel J-1 à 18h pour les events du lendemain (legacy — Phase 1).
Schedule::command('tickets:remind-day-before')
    ->dailyAt('18:00')
    ->name('nwc:tickets-remind-day-before')
    ->onOneServer()
    ->withoutOverlapping();

// ============================================================
// === Sprint B — Notifications billetterie ==================
// ============================================================

// #2 Digest quotidien billetterie — 08:00 chaque matin.
Schedule::command('nwc:tickets-daily-digest')
    ->dailyAt('08:00')
    ->name('nwc:tickets-daily-digest')
    ->onOneServer()
    ->withoutOverlapping();

// #5 Rappel J-1 (hourly) — cible events avec starts_at entre now+24h et now+25h.
// Idempotence via flag reminders_j1_sent_at sur Event.
Schedule::command('nwc:tickets-remind-j1')
    ->hourly()
    ->name('nwc:tickets-remind-j1')
    ->onOneServer()
    ->withoutOverlapping();

// Billetterie Phase 2 : expire les paiements pending > 24h (toutes les heures).
Schedule::command('tickets:expire-pending')
    ->hourly()
    ->name('nwc:tickets-expire-pending')
    ->onOneServer()
    ->withoutOverlapping();

// Étape E — Auto-révocation grants event_staff + guest tokens des events
// terminés depuis > 24h. Tourne quotidiennement à 3h15 (heure creuse).
Schedule::command('nwc:revoke-expired-event-staff')
    ->dailyAt('03:15')
    ->name('nwc:revoke-expired-event-staff')
    ->onOneServer()
    ->withoutOverlapping();

// Billetterie Phase 4 : récap hebdo lundi 8h → pasteur + admins.
Schedule::command('tickets:weekly-recap')
    ->weeklyOn(1, '08:00') // 1 = lundi
    ->name('nwc:tickets-weekly-recap')
    ->onOneServer()
    ->withoutOverlapping();

// Le 1er de chaque mois à 8h : liste PDF des anniversaires du mois → RH.
Schedule::job(new SendMonthlyBirthdaysListJob())
    ->monthlyOn(1, '08:00')
    ->name('nwc:monthly-birthdays')
    ->onOneServer()
    ->withoutOverlapping();

// ============================================================
// === Maintenance & cleanup — éviter l'accumulation infinie ==
// ============================================================

// Tous les dimanches à 3h : purge notifications lues + PDFs orphelins + activity log.
Schedule::job(new CleanupStorageAndLogsJob())
    ->weeklyOn(0, '03:00') // 0 = dimanche
    ->name('nwc:cleanup-storage-logs')
    ->onOneServer()
    ->withoutOverlapping();

// Tous les jours à 2h30 : prune Telescope (garde 72h d'observability seulement).
Schedule::command('telescope:prune --hours=72')
    ->dailyAt('02:30')
    ->name('nwc:prune-telescope')
    ->onOneServer();

// Tous les lundis à 4h : prune failed jobs > 7 jours.
Schedule::command('queue:prune-failed --hours=168')
    ->weeklyOn(1, '04:00')
    ->name('nwc:prune-failed-jobs')
    ->onOneServer();

// Tous les jours à 2h : nettoie les password_reset_tokens expirés.
Schedule::command('auth:clear-resets')
    ->dailyAt('02:00')
    ->name('nwc:clear-password-resets')
    ->onOneServer();

// ============================================================
// === Backups DB + fichiers (spatie/laravel-backup) ==========
// ============================================================

// Backup quotidien (DB + storage) à 2h45 ; supprime les vieux backups à 3h45.
// La config détaillée vit dans config/backup.php (rétention, disques cibles, etc.).
Schedule::command('backup:clean')
    ->dailyAt('03:45')
    ->name('nwc:backup-clean')
    ->onOneServer();

Schedule::command('backup:run --only-db')
    ->dailyAt('02:45') // backup DB léger tous les jours
    ->name('nwc:backup-db')
    ->onOneServer();

Schedule::command('backup:run')
    ->weeklyOn(0, '04:30') // backup complet (DB + storage) le dimanche
    ->name('nwc:backup-full')
    ->onOneServer();
