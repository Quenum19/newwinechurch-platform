<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\EventTicketWaitlist;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Notifications\Billetterie\AlerteAnomalieSecuriteNotification;
use App\Notifications\Billetterie\AlerteCapaciteNotification;
use App\Notifications\Billetterie\AlerteWaitlistNotification;
use App\Notifications\Billetterie\NouvelleInscriptionAdminNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Service centralisé Sprint B — dispatch des notifications billetterie.
 *
 * Chaque méthode :
 *  - récupère les destinataires selon la permission Spatie visée
 *  - filtre selon UserNotificationPreference (opt-out)
 *  - applique le throttle Cache (fenêtre glissante) pour éviter le spam
 *  - swallow les erreurs (les mutations métier ne doivent PAS casser
 *    si la queue est indisponible)
 */
class BilletterieNotifier
{
    // ================================================================
    // === 1. Nouvelle inscription — après émission ticket ===========
    // ================================================================

    public function nouvelleInscription(Event $event, EventTicket $ticket): void
    {
        try {
            $throttleKey = "nwc_notif_new_ticket_e{$event->id}";
            $minutes = (int) config('notifications.throttle.nouvelle_inscription_minutes', 5);
            if (Cache::has($throttleKey)) return;
            Cache::put($throttleKey, 1, now()->addMinutes($minutes));

            // Recompute total sold/capacity pour affichage.
            $sold = $event->tickets_sold;

            $recipients = $this->recipientsWithPermission('manage event tickets', 'nouvelle_inscription');
            if ($recipients->isEmpty()) return;

            Notification::send(
                $recipients,
                new NouvelleInscriptionAdminNotification($event, $ticket, $sold),
            );
        } catch (\Throwable $e) {
            Log::warning('BilletterieNotifier::nouvelleInscription failed', [
                'event' => $event->id, 'err' => $e->getMessage(),
            ]);
        }
    }

    // ================================================================
    // === 3. Alerte capacité — 80% / 95% ============================
    // ================================================================

    public function alerteCapaciteSiSeuil(Event $event): void
    {
        try {
            if (! $event->tickets_capacity || $event->tickets_capacity <= 0) return;

            $sold = $event->tickets_sold;
            $rate = round(($sold / $event->tickets_capacity) * 100, 1);

            $thresholds = config('notifications.capacity_thresholds', [80, 95]);
            $reached = null;
            foreach (array_reverse($thresholds) as $t) {
                if ($rate >= $t) { $reached = $t; break; }
            }
            if ($reached === null) return;

            // One-shot par palier.
            $col = "alert_{$reached}_sent_at";
            if ($event->$col) return;

            // Marque immédiatement (transaction-safe : évite double-send si
            // 2 achats concurrents franchissent le seuil).
            $event->forceFill([$col => now()])->save();

            $remaining = $event->tickets_capacity - $sold;

            // Destinataires = perm globale + managers scopés.
            $globals = $this->recipientsWithPermission('manage event tickets', 'alerte_capacite');
            $managerIds = $event->activeStaff()
                ->where('grant', 'manager')
                ->pluck('user_id');
            $scoped = User::whereIn('id', $managerIds)
                ->get()
                ->filter(fn ($u) => UserNotificationPreference::isEnabledFor($u, 'alerte_capacite'));

            $recipients = $globals->merge($scoped)->unique('id');
            if ($recipients->isEmpty()) return;

            Notification::send(
                $recipients,
                new AlerteCapaciteNotification($event, $reached, $rate, max(0, $remaining)),
            );
        } catch (\Throwable $e) {
            Log::warning('BilletterieNotifier::alerteCapaciteSiSeuil failed', [
                'event' => $event->id, 'err' => $e->getMessage(),
            ]);
        }
    }

    // ================================================================
    // === 4. Alerte waitlist ========================================
    // ================================================================

    public function alerteWaitlist(EventTicketWaitlist $entry): void
    {
        try {
            $throttleKey = "nwc_notif_waitlist_e{$entry->event_id}";
            $minutes = (int) config('notifications.throttle.waitlist_minutes', 30);
            if (Cache::has($throttleKey)) return;
            Cache::put($throttleKey, 1, now()->addMinutes($minutes));

            $event = $entry->event;
            if (! $event) return;

            $recipients = $this->recipientsWithPermission('manage event tickets', 'alerte_waitlist');
            if ($recipients->isEmpty()) return;

            Notification::send(
                $recipients,
                new AlerteWaitlistNotification($event, $entry),
            );
        } catch (\Throwable $e) {
            Log::warning('BilletterieNotifier::alerteWaitlist failed', [
                'waitlist' => $entry->id, 'err' => $e->getMessage(),
            ]);
        }
    }

    // ================================================================
    // === 7. Anomalie sécurité — scans invalides burst ==============
    // ================================================================

    public function anomalieSiSeuilAtteint(?Event $event, string $ip): void
    {
        try {
            $window = (int) config('notifications.throttle.securite_window_seconds', 60);
            $max    = (int) config('notifications.throttle.securite_max_invalid_scans', 5);
            $throttleMin = (int) config('notifications.throttle.securite_minutes', 60);

            // Compteur rolling (auto-expire à la fin de la fenêtre).
            $counterKey = "nwc_notif_scan_invalid:{$ip}";
            $count = (int) Cache::get($counterKey, 0);
            $count++;
            Cache::put($counterKey, $count, now()->addSeconds($window));

            if ($count < $max) return;

            // Throttle : 1 alerte / heure / IP.
            $throttleKey = "nwc_notif_security_alert:{$ip}";
            if (Cache::has($throttleKey)) return;
            Cache::put($throttleKey, 1, now()->addMinutes($throttleMin));

            // Superadmin uniquement.
            $recipients = User::role('superadmin')
                ->where('status', 'active')
                ->get();

            if ($recipients->isEmpty()) return;

            Notification::send(
                $recipients,
                new AlerteAnomalieSecuriteNotification($ip, $event, $count, now()),
            );
        } catch (\Throwable $e) {
            Log::warning('BilletterieNotifier::anomalieSecurite failed', [
                'ip' => $ip, 'err' => $e->getMessage(),
            ]);
        }
    }

    // ================================================================
    // === Helpers ===================================================
    // ================================================================

    /**
     * Users actifs disposant d'une permission Spatie ET qui n'ont PAS opt-out
     * de la clé de préférence donnée.
     */
    protected function recipientsWithPermission(string $permission, string $prefKey)
    {
        return User::permission($permission)
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $u) => UserNotificationPreference::isEnabledFor($u, $prefKey))
            ->values();
    }
}
