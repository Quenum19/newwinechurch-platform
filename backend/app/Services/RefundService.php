<?php

namespace App\Services;

use App\Mail\TicketRefundedMail;
use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use App\Notifications\WhatsApp\TicketRefundedWhatsApp;
use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Phase 6 — Service centralisé de remboursement / annulation.
 *
 * Granularité : ticket | order (commande) | event (bulk).
 *
 * Garde-fous :
 *  - On ne rembourse pas un ticket 'used' (déjà scanné/entré) sauf si force=true
 *  - On ne re-rembourse pas un ticket 'refunded'
 *  - Seuls les tickets 'paid' génèrent un vrai refund (transaction sortante)
 *  - Les tickets 'free' et 'pending' sont juste 'cancelled' (libère place)
 */
class RefundService
{
    public function __construct(private WhatsAppService $whatsapp) {}

    /**
     * Rembourse 1 ticket. Retourne le ticket mis à jour ou null si déjà inactif.
     *
     * @param array{ method?: string, reference?: string, amount_fcfa?: int|null } $details
     */
    public function refundTicket(EventTicket $ticket, User $admin, string $reason, array $details = [], bool $force = false): ?EventTicket
    {
        if ($ticket->payment_status === 'refunded') {
            return null;
        }
        if ($ticket->status === 'used' && ! $force) {
            throw new \DomainException("Impossible de rembourser un ticket déjà entré. Force requise (superadmin).");
        }

        DB::transaction(function () use ($ticket, $admin, $reason, $details) {
            $ticket->update([
                'status'             => 'cancelled',
                // Mapping payment_status :
                //   paid    → refunded (vrai remboursement, sortie Mobile Money)
                //   pending → refused  (paiement non confirmé, libère la place)
                //   free    → free     (rien à rembourser, juste cancel présentiel)
                'payment_status'     => $this->mapRefundPaymentStatus($ticket->payment_status),
                'refunded_at'        => now(),
                'refunded_by_id'     => $admin->id,
                'refund_reason'      => $reason,
                'refund_method'      => $details['method']    ?? null,
                'refund_reference'   => $details['reference'] ?? null,
                'refund_amount_fcfa' => $ticket->payment_status === 'paid'
                    ? ($details['amount_fcfa'] ?? $ticket->price_fcfa)
                    : 0,
            ]);
        });

        // Notifs (1 mail par ticket, 1 WhatsApp aussi). On peut grouper côté order
        // pour éviter le spam mais pour 1 ticket isolé c'est intentionnel.
        $this->notifyHolder($ticket->refresh(), $reason);

        Log::info('Ticket refunded', [
            'ticket_id' => $ticket->id, 'admin' => $admin->id,
            'amount' => $ticket->refund_amount_fcfa,
        ]);

        return $ticket;
    }

    /**
     * Rembourse une commande entière (tous les tickets d'un order_code).
     * Envoi UN seul mail récap + UN seul WhatsApp (sur le 1er ticket).
     *
     * @return array{ count: int, refunded: int, cancelled: int }
     */
    public function refundOrder(string $orderCode, User $admin, string $reason, array $details = [], bool $force = false): array
    {
        $tickets = EventTicket::where('order_code', $orderCode)->get();
        if ($tickets->isEmpty()) {
            return ['count' => 0, 'refunded' => 0, 'cancelled' => 0];
        }

        $stats = ['count' => 0, 'refunded' => 0, 'cancelled' => 0];
        DB::transaction(function () use ($tickets, $admin, $reason, $details, $force, &$stats) {
            foreach ($tickets as $t) {
                if ($t->payment_status === 'refunded') continue;
                if ($t->status === 'used' && ! $force) continue;

                $isPaid = $t->payment_status === 'paid';
                $t->update([
                    'status'             => 'cancelled',
                    'payment_status'     => $this->mapRefundPaymentStatus($t->payment_status),
                    'refunded_at'        => now(),
                    'refunded_by_id'     => $admin->id,
                    'refund_reason'      => $reason,
                    'refund_method'      => $details['method']    ?? null,
                    'refund_reference'   => $details['reference'] ?? null,
                    'refund_amount_fcfa' => $isPaid ? $t->price_fcfa : 0,
                ]);
                $stats['count']++;
                $isPaid ? $stats['refunded']++ : $stats['cancelled']++;
            }
        });

        // 1 notif récap sur le 1er ticket (le payeur).
        $this->notifyHolder($tickets->first()->refresh(), $reason, isOrderLevel: true);

        Log::info('Order refunded', [
            'order_code' => $orderCode, 'admin' => $admin->id, 'stats' => $stats,
        ]);

        return $stats;
    }

    /**
     * Bulk : rembourse tous les tickets actifs d'un event (cas event annulé).
     * Groupé par order_code pour n'envoyer qu'un mail par commande.
     */
    public function refundEvent(Event $event, User $admin, string $reason): array
    {
        $orderCodes = EventTicket::where('event_id', $event->id)
            ->whereNotIn('payment_status', ['refunded'])
            ->whereNotIn('status', ['used']) // les déjà entrés sont préservés (sauf force)
            ->pluck('order_code')->unique();

        $totals = ['orders' => 0, 'tickets' => 0, 'refunded' => 0, 'cancelled' => 0];
        foreach ($orderCodes as $code) {
            $r = $this->refundOrder($code, $admin, $reason);
            $totals['orders']++;
            $totals['tickets']   += $r['count'];
            $totals['refunded']  += $r['refunded'];
            $totals['cancelled'] += $r['cancelled'];
        }

        Log::info('Event bulk refunded', [
            'event_id' => $event->id, 'admin' => $admin->id, 'totals' => $totals,
        ]);

        return $totals;
    }

    /** Mapping payment_status après refund. */
    private function mapRefundPaymentStatus(string $current): string
    {
        return match ($current) {
            'paid'    => 'refunded',
            'pending' => 'refused', // équivalent au refus, libère la place
            default   => $current,  // 'free' → reste 'free' (juste status=cancelled)
        };
    }

    /** Envoie email + WhatsApp à l'inscrit (idempotent : 1 fois par commande). */
    private function notifyHolder(EventTicket $ticket, string $reason, bool $isOrderLevel = false): void
    {
        try {
            Mail::to($ticket->email)->send(new TicketRefundedMail($ticket, $reason, $isOrderLevel));
        } catch (\Throwable $e) {
            Log::warning('Refund mail failed', ['ticket_id' => $ticket->id, 'err' => $e->getMessage()]);
        }
        (new TicketRefundedWhatsApp($ticket, $reason))->send($this->whatsapp);
    }
}
