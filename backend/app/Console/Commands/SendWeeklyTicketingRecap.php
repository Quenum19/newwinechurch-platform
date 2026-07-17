<?php

namespace App\Console\Commands;

use App\Mail\WeeklyTicketingRecapMail;
use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Phase 4 — Cron lundi 8h : récap billetterie de la semaine écoulée.
 *
 * Destinataires : pasteur + admin + admin-site (rôles staff billetterie).
 * Idempotent : envoyer 2x le même lundi = 2 mails (OK pour test).
 */
class SendWeeklyTicketingRecap extends Command
{
    protected $signature = 'tickets:weekly-recap';
    protected $description = 'Envoie le récap billetterie de la semaine écoulée à l\'équipe.';

    public function handle(): int
    {
        // Période semaine écoulée : lundi 0h → dimanche 23h59
        $weekStart = now()->copy()->subWeek()->startOfWeek(Carbon::MONDAY);
        $weekEnd   = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

        // === Métriques semaine ===
        $weekSignups = EventTicket::whereBetween('created_at', [$weekStart, $weekEnd])->count();
        $weekRevenue = EventTicket::where('payment_status', 'paid')
            ->whereBetween('payment_validated_at', [$weekStart, $weekEnd])
            ->sum('price_fcfa');

        // === Conversion 30j ===
        $thirty = now()->copy()->subDays(30);
        $createdInWindow = EventTicket::where('created_at', '>=', $thirty)
            ->whereIn('payment_status', ['pending', 'paid', 'refused', 'expired'])
            ->count();
        $paidInWindow = EventTicket::where('created_at', '>=', $thirty)
            ->where('payment_status', 'paid')->count();
        $conversionRate = $createdInWindow > 0 ? round($paidInWindow / $createdInWindow * 100, 1) : 0;

        // === Pending tous events ===
        $pendingCount = EventTicket::where('payment_status', 'pending')->distinct('order_code')->count('order_code');

        // === Alerts (events bientôt complets, pending expirés non traités, etc.) ===
        $alerts = [];
        $nearFull = Event::where('ticketing_enabled', true)
            ->where('starts_at', '>=', now())
            ->whereNotNull('tickets_capacity')
            ->get()
            ->filter(fn ($e) => $e->tickets_capacity > 0 && ($e->tickets_sold / $e->tickets_capacity) >= 0.8);
        foreach ($nearFull as $e) {
            $alerts[] = "{$e->title} : " . round($e->tickets_sold / $e->tickets_capacity * 100, 0) . "% rempli (" .
                       $e->tickets_sold . '/' . $e->tickets_capacity . ").";
        }
        if ($pendingCount > 10) {
            $alerts[] = "{$pendingCount} commandes en attente de validation paiement. Pense à traiter.";
        }

        // === Top events (semaine écoulée par revenus) ===
        $topEvents = Event::where('ticketing_enabled', true)
            ->whereHas('tickets', fn ($q) => $q->whereBetween('created_at', [$weekStart, $weekEnd]))
            ->with(['tickets' => fn ($q) => $q->whereBetween('created_at', [$weekStart, $weekEnd])
                ->select('id', 'event_id', 'price_fcfa', 'payment_status', 'status')])
            ->get()
            ->map(function (Event $event) {
                $sold = $event->tickets->whereIn('payment_status', ['free', 'pending', 'paid'])->count();
                return [
                    'title'     => $event->title,
                    'sold'      => $sold,
                    'capacity'  => $event->tickets_capacity,
                    'fill_rate' => $event->tickets_capacity ? round($sold / $event->tickets_capacity * 100, 1) : null,
                    'revenue'   => $event->tickets->where('payment_status', 'paid')->sum('price_fcfa'),
                ];
            })
            ->sortByDesc('revenue')
            ->take(5)
            ->values()
            ->toArray();

        $payload = [
            'week_label'      => $weekStart->locale('fr')->isoFormat('D MMM') . ' → ' .
                                 $weekEnd->locale('fr')->isoFormat('D MMM YYYY'),
            'week_signups'    => $weekSignups,
            'week_revenue'    => (int) $weekRevenue,
            'conversion_rate' => $conversionRate,
            'pending_count'   => $pendingCount,
            'alerts'          => $alerts,
            'top_events'      => $topEvents,
        ];

        // === Destinataires : pasteur + admin + admin-site ===
        $recipients = User::role(['pasteur', 'admin', 'admin-site', 'superadmin'])
            ->where('status', 'active')
            ->pluck('email')
            ->unique()
            ->values();

        if ($recipients->isEmpty()) {
            $this->warn('Aucun destinataire trouvé pour le récap.');
            return self::SUCCESS;
        }

        $sent = 0;
        foreach ($recipients as $email) {
            try {
                Mail::to($email)->send(new WeeklyTicketingRecapMail($payload));
                $sent++;
            } catch (\Throwable $e) {
                $this->warn("Échec envoi à $email : " . $e->getMessage());
            }
        }

        $this->info("✓ Récap semaine envoyé à {$sent} destinataire(s).");
        return self::SUCCESS;
    }
}
