<?php

namespace App\Services\Payment;

use App\Models\Event;
use App\Models\EventTicket;
use App\Services\Payment\Contracts\PaymentGatewayDriver;
use App\Services\Payment\Drivers\CinetPayDriver;
use App\Services\Payment\Drivers\StubDriver;
use App\Services\TicketPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service facade-like — point d'entrée pour les passerelles paiement.
 *
 *  initiateForOrder(orderCode)  : démarre un paiement pour une commande pending
 *  handleWebhook(payload)       : traite un callback provider → auto-valide
 *
 * Le service auto-câble le driver selon `config('payments.default_driver')`.
 * En prod : 'cinetpay'. En dev/test : 'stub' (par défaut).
 */
class PaymentGatewayService
{
    private PaymentGatewayDriver $driver;

    public function __construct(private TicketPaymentService $payments)
    {
        $this->driver = $this->resolveDriver();
    }

    public function driverName(): string
    {
        return $this->driver->name();
    }

    /**
     * Démarre un paiement pour une commande pending.
     * Renvoie l'URL où rediriger l'inscrit.
     */
    public function initiateForOrder(string $orderCode): array
    {
        $tickets = EventTicket::with('event')
            ->where('order_code', $orderCode)
            ->where('payment_status', 'pending')
            ->get();

        if ($tickets->isEmpty()) {
            return ['ok' => false, 'error' => 'Commande introuvable ou déjà traitée.'];
        }
        $first = $tickets->first();
        $event = $first->event;

        if ($event->payment_mode !== 'cinetpay') {
            return ['ok' => false, 'error' => "Cet événement utilise le mode déclaratif — paiement automatique indisponible."];
        }

        $total = (int) $tickets->sum('price_fcfa');
        if ($total <= 0) {
            return ['ok' => false, 'error' => 'Montant invalide.'];
        }

        $result = $this->driver->initiate([
            'transaction_id' => $orderCode,
            'amount_fcfa'    => $total,
            'description'    => mb_substr("Ticket {$event->title}", 0, 100),
            'customer_name'  => trim($first->first_name . ' ' . $first->last_name),
            'customer_email' => $first->email,
            'customer_phone' => $first->phone,
        ]);

        if (! ($result['ok'] ?? false)) {
            Log::warning('Payment init failed', ['order' => $orderCode, 'result' => $result]);
            return $result;
        }

        // Marque tous les tickets avec le provider + transaction_id pour traçabilité
        $tickets->each(fn ($t) => $t->update([
            'gateway_provider'       => $this->driver->name(),
            'gateway_transaction_id' => $orderCode,
        ]));

        Log::info('Payment initiated', [
            'order' => $orderCode, 'driver' => $this->driver->name(),
            'amount' => $total, 'url' => $result['payment_url'] ?? null,
        ]);

        return $result;
    }

    /**
     * Traite un webhook reçu du provider.
     * Si le paiement est validé, déclenche TicketPaymentService::validateOrder()
     * en utilisant un user système (le 1er superadmin actif).
     */
    public function handleWebhook(array $payload, array $headers = []): array
    {
        if (! $this->driver->verifyWebhook($payload, $headers)) {
            Log::warning('Webhook rejected — signature/check failed', ['provider' => $this->driver->name()]);
            return ['ok' => false, 'error' => 'Webhook non vérifié.'];
        }

        $parsed = $this->driver->parseWebhook($payload);
        $orderCode = $parsed['transaction_id'];

        $tickets = EventTicket::where('order_code', $orderCode)->get();
        if ($tickets->isEmpty()) {
            return ['ok' => false, 'error' => "Commande $orderCode introuvable."];
        }

        // Stocke le payload brut pour audit
        $tickets->each(fn ($t) => $t->update(['gateway_payload' => $parsed['raw']]));

        // Statut déjà payé (idempotency) → on ne fait rien.
        if ($tickets->first()->payment_status === 'paid') {
            Log::info('Webhook idempotent — already paid', ['order' => $orderCode]);
            return ['ok' => true, 'idempotent' => true];
        }

        if ($parsed['status'] !== 'paid') {
            Log::info('Webhook : payment not successful', ['order' => $orderCode, 'parsed' => $parsed]);
            // On ne refuse pas encore (laisse l'admin décider) — on log juste.
            return ['ok' => true, 'status' => 'pending'];
        }

        // === Auto-validation ===
        $tickets->each(fn ($t) => $t->update([
            'payment_method'    => $this->driver->name(), // 'cinetpay'
            'payment_reference' => $parsed['gateway_id'] ?: $orderCode,
        ]));

        // On utilise un user système (le 1er superadmin) pour le validated_by.
        $systemUser = \App\Models\User::role('superadmin')->first();
        if (! $systemUser) {
            Log::error('Webhook : no superadmin found to validate', ['order' => $orderCode]);
            return ['ok' => false, 'error' => 'Aucun superadmin actif pour valider automatiquement.'];
        }

        $result = $this->payments->validateOrder($orderCode, $systemUser);
        Log::info('Webhook auto-validated', [
            'order' => $orderCode, 'result' => $result,
        ]);

        return ['ok' => true, 'status' => 'paid', 'validated' => $result];
    }

    private function resolveDriver(): PaymentGatewayDriver
    {
        return match (config('payments.default_driver')) {
            'cinetpay' => new CinetPayDriver(config('payments.cinetpay', [])),
            default    => new StubDriver(),
        };
    }
}
