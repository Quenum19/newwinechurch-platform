<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Notifications\Billetterie\DigestQuotidienBilletterieNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Sprint B — #2 Digest quotidien billetterie (8h00 chaque matin).
 *
 * Envoyé à : perm `view billetterie dashboard`
 *   (superadmin, admin, pasteur, rh, tresorier via seeder RolesAndPermissions).
 * Contenu : bilan 00:00 → 23:59 de la veille.
 * Idempotent : envoyer 2x = 2 mails (OK pour test, le cron ne tourne qu'1 fois/jour).
 */
class SendDailyTicketingDigest extends Command
{
    protected $signature = 'nwc:tickets-daily-digest';
    protected $description = 'Envoie le digest billetterie de la veille à 08:00.';

    public function handle(): int
    {
        $yesterday    = now()->copy()->subDay();
        $yesterdayStart = $yesterday->copy()->startOfDay();
        $yesterdayEnd   = $yesterday->copy()->endOfDay();

        // === Tickets nouveaux (created_at hier) ===
        $ticketsCount = EventTicket::whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
            ->count();

        // === Revenus par méthode de paiement (paid + validated hier) ===
        $revenueRows = EventTicket::where('payment_status', 'paid')
            ->whereBetween('payment_validated_at', [$yesterdayStart, $yesterdayEnd])
            ->selectRaw('COALESCE(payment_method, "autre") as method, SUM(price_fcfa) as total')
            ->groupBy('method')
            ->pluck('total', 'method');

        $revenueTotal = (int) $revenueRows->sum();
        $revenueByMethod = $revenueRows->toArray();

        // === Remboursements hier ===
        $refundsCount = EventTicket::where('payment_status', 'refunded')
            ->whereBetween('refunded_at', [$yesterdayStart, $yesterdayEnd])
            ->count();

        // === Top event du jour (par nb tickets) ===
        $topEventRow = EventTicket::whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
            ->selectRaw('event_id, COUNT(*) as c')
            ->groupBy('event_id')
            ->orderByDesc('c')
            ->first();
        $topEvent = null;
        if ($topEventRow) {
            $ev = Event::find($topEventRow->event_id);
            if ($ev) $topEvent = ['title' => $ev->title, 'count' => (int) $topEventRow->c];
        }

        // === Alertes ===
        $alerts = [];

        // Events proches et bientôt complets
        $nearFull = Event::where('ticketing_enabled', true)
            ->where('starts_at', '>=', now())
            ->whereNotNull('tickets_capacity')
            ->get()
            ->filter(fn ($e) => $e->tickets_capacity > 0
                && ($e->tickets_sold / $e->tickets_capacity) >= 0.8);
        foreach ($nearFull as $e) {
            $pct = round(($e->tickets_sold / $e->tickets_capacity) * 100, 0);
            $alerts[] = "{$e->title} — {$pct}% rempli ({$e->tickets_sold}/{$e->tickets_capacity}).";
        }

        // Waitlist non traitée
        $waitlistWaiting = \App\Models\EventTicketWaitlist::where('status', 'waiting')->count();
        if ($waitlistWaiting > 0) {
            $alerts[] = "{$waitlistWaiting} personne(s) en liste d'attente en cours.";
        }

        $payload = [
            'date_label'        => $yesterdayStart->locale('fr')->isoFormat('dddd D MMMM'),
            'tickets_count'     => $ticketsCount,
            'revenue_total'     => $revenueTotal,
            'revenue_by_method' => $revenueByMethod,
            'refunds_count'     => $refundsCount,
            'top_event'         => $topEvent,
            'alerts'            => $alerts,
        ];

        // === Destinataires : perm `view billetterie dashboard` + opt-in ===
        $recipients = User::permission('view billetterie dashboard')
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $u) => UserNotificationPreference::isEnabledFor($u, 'digest_quotidien'))
            ->values();

        if ($recipients->isEmpty()) {
            $this->warn('Aucun destinataire pour le digest quotidien.');
            return self::SUCCESS;
        }

        Notification::send($recipients, new DigestQuotidienBilletterieNotification($payload));

        $this->info("✓ Digest quotidien envoyé à {$recipients->count()} destinataire(s).");
        return self::SUCCESS;
    }
}
