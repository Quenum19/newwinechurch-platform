<?php

namespace App\Services\Payment\Drivers;

use App\Services\Payment\Contracts\PaymentGatewayDriver;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Driver stub (Phase 7 dev/test) — simule un paiement sans appel HTTP.
 *
 *  initiate()      → renvoie une URL fictive http://payment.stub/{transaction_id}
 *  verifyWebhook() → toujours true
 *  parseWebhook()  → utilise les valeurs brutes du payload
 *
 * Sert en :
 *  - dev local (pas de compte CinetPay)
 *  - tests E2E reproductibles
 *  - démo lorsqu'on ne veut pas dépendre d'un compte externe
 */
class StubDriver implements PaymentGatewayDriver
{
    public function name(): string { return 'stub'; }

    public function initiate(array $payload): array
    {
        $token = 'STUB_' . strtoupper(Str::random(12));
        $url = rtrim(config('app.frontend_url', config('app.url')), '/') . '/dev/payment-stub/' . $payload['transaction_id'];

        Log::info('💳 Payment [STUB driver]', [
            'transaction_id' => $payload['transaction_id'],
            'amount'         => $payload['amount_fcfa'],
            'token'          => $token,
            'url'            => $url,
        ]);

        return ['ok' => true, 'payment_url' => $url, 'payment_token' => $token];
    }

    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        return true; // Stub : tout est valide
    }

    public function parseWebhook(array $payload): array
    {
        return [
            'transaction_id' => $payload['transaction_id'] ?? '',
            'status'         => $payload['status'] ?? 'paid',
            'amount_fcfa'    => (int) ($payload['amount_fcfa'] ?? 0),
            'gateway_id'     => $payload['gateway_id'] ?? ('STUB_' . uniqid()),
            'raw'            => $payload,
        ];
    }
}
