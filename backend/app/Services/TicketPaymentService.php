<?php

namespace App\Services;

use App\Mail\PaymentRefusedMail;
use App\Mail\PaymentValidatedMail;
use App\Models\EventTicket;
use App\Models\User;
use App\Notifications\WhatsApp\TicketsReadyWhatsApp;
use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Service centralisé Phase 2 — validation/refus/expiration paiement.
 *
 * Toute mutation de payment_status passe par ce service pour garantir :
 *  - logging cohérent
 *  - traçabilité (validated_by, refusal_reason)
 *  - déclenchement émission ticket (PDF + mail) à la validation
 *  - notification mail à l'inscrit (validation OU refus)
 *  - transactions DB sûres
 */
class TicketPaymentService
{
    public function __construct(
        private TicketIssuer $issuer,
        private WhatsAppService $whatsapp,
    ) {}

    /**
     * Marque les tickets d'une commande comme PAYÉS et déclenche leur émission.
     * Le validateur doit avoir la perm 'validate ticket payments'.
     */
    public function validateOrder(string $orderCode, User $validator): array
    {
        $tickets = EventTicket::with('event')
            ->where('order_code', $orderCode)
            ->where('payment_status', 'pending')
            ->get();

        if ($tickets->isEmpty()) {
            return ['validated' => 0, 'sent' => 0, 'errors' => ['Aucun ticket pending pour cette commande.']];
        }

        DB::transaction(function () use ($tickets, $validator) {
            foreach ($tickets as $t) {
                $t->update([
                    'payment_status'         => 'paid',
                    'payment_validated_at'   => now(),
                    'payment_validated_by_id'=> $validator->id,
                ]);
            }
        });

        // Envoi des tickets (PDF + QR) maintenant que c'est payé.
        $sent = 0;
        $errors = [];
        foreach ($tickets as $t) {
            $r = $this->issuer->issueAndSend($t);
            if ($r['sent']) $sent++;
            else $errors[] = $r['error'] ?? 'inconnu';
        }

        // Phase 3 — WhatsApp "Tickets prêts" (1 msg sur le 1er ticket).
        (new TicketsReadyWhatsApp($tickets->first()))->send($this->whatsapp);

        Log::info('Ticket payment validated', [
            'order_code' => $orderCode, 'validator' => $validator->id,
            'count' => $tickets->count(), 'sent' => $sent,
        ]);

        return ['validated' => $tickets->count(), 'sent' => $sent, 'errors' => $errors];
    }

    /**
     * Refuse une commande (raison obligatoire). Notif mail à l'inscrit + log.
     */
    public function refuseOrder(string $orderCode, User $validator, string $reason): int
    {
        $tickets = EventTicket::with('event')
            ->where('order_code', $orderCode)
            ->where('payment_status', 'pending')
            ->get();

        if ($tickets->isEmpty()) return 0;

        DB::transaction(function () use ($tickets, $validator, $reason) {
            foreach ($tickets as $t) {
                $t->update([
                    'payment_status'         => 'refused',
                    'payment_validated_at'   => now(),
                    'payment_validated_by_id'=> $validator->id,
                    'payment_refusal_reason' => $reason,
                    'status'                 => 'cancelled', // libère la place
                ]);
            }
        });

        // 1 seul mail à l'inscrit (le 1er ticket porte l'email du payeur).
        $first = $tickets->first();
        try {
            Mail::to($first->email)->send(new PaymentRefusedMail($first, $reason));
        } catch (\Throwable $e) {
            Log::warning('PaymentRefused mail failed', ['order' => $orderCode, 'err' => $e->getMessage()]);
        }

        Log::info('Ticket payment refused', [
            'order_code' => $orderCode, 'validator' => $validator->id,
            'reason' => $reason, 'count' => $tickets->count(),
        ]);

        return $tickets->count();
    }

    /**
     * Cron : expire les commandes pending > payment_expires_at.
     * Renvoie le nombre de tickets passés à 'expired'.
     */
    public function expirePendingPayments(): int
    {
        $expired = EventTicket::where('payment_status', 'pending')
            ->whereNotNull('payment_expires_at')
            ->where('payment_expires_at', '<', now())
            ->get();

        if ($expired->isEmpty()) return 0;

        DB::transaction(function () use ($expired) {
            foreach ($expired as $t) {
                $t->update([
                    'payment_status'         => 'expired',
                    'payment_refusal_reason' => 'Délai de paiement dépassé (auto)',
                    'status'                 => 'cancelled',
                ]);
            }
        });

        Log::info('Tickets expired (24h timeout)', ['count' => $expired->count()]);
        return $expired->count();
    }
}
