<?php

namespace App\Services\Payment\Drivers;

use App\Services\Payment\Contracts\PaymentGatewayDriver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Driver CinetPay (Phase 7).
 *
 * Doc API : https://docs.cinetpay.com/api/v2/
 *
 * Endpoint init :
 *   POST https://api-checkout.cinetpay.com/v2/payment
 *
 * Vérification webhook : on rappelle CinetPay /check pour confirmer le statut.
 * C'est la méthode officielle recommandée par CinetPay (pas de signature HMAC
 * dans le payload).
 */
class CinetPayDriver implements PaymentGatewayDriver
{
    private string $baseUrl;

    public function __construct(private array $config)
    {
        // Sandbox et prod utilisent la MÊME URL côté CinetPay v2.
        // C'est le compte (api_key) qui détermine si on est en test ou prod.
        $this->baseUrl = 'https://api-checkout.cinetpay.com/v2';
    }

    public function name(): string
    {
        return 'cinetpay';
    }

    public function initiate(array $payload): array
    {
        if (! $this->config['api_key'] || ! $this->config['site_id']) {
            return ['ok' => false, 'error' => 'CinetPay non configuré (api_key ou site_id manquant).'];
        }

        $body = [
            'apikey'           => $this->config['api_key'],
            'site_id'          => $this->config['site_id'],
            'transaction_id'   => $payload['transaction_id'],
            'amount'           => $payload['amount_fcfa'],
            'currency'         => $this->config['currency'] ?? 'XOF',
            'description'      => mb_substr($payload['description'], 0, 100),
            'customer_name'    => $payload['customer_name'],
            'customer_surname' => '', // Optionnel — CinetPay accepte vide
            'customer_email'   => $payload['customer_email'],
            'customer_phone_number' => preg_replace('/\D+/', '', $payload['customer_phone']),
            'channels'         => $this->config['channels'] ?? 'ALL',
            'lang'             => $this->config['lang'] ?? 'fr',
            'return_url'       => ($payload['return_url'] ?? $this->config['return_url']) . '/' . $payload['transaction_id'],
            'notify_url'       => $this->config['notify_url'],
        ];

        try {
            $resp = Http::timeout($this->config['timeout'] ?? 15)
                ->acceptJson()
                ->post($this->baseUrl . '/payment', $body);

            $json = $resp->json() ?? [];

            // Format CinetPay :
            //   { code: "201", message: "CREATED", api_response_id, data: { payment_url, payment_token } }
            if ($resp->successful() && ($json['code'] ?? null) === '201') {
                return [
                    'ok'            => true,
                    'payment_url'   => $json['data']['payment_url']  ?? null,
                    'payment_token' => $json['data']['payment_token'] ?? null,
                    'raw'           => $json,
                ];
            }

            $err = $json['message'] ?? ('HTTP ' . $resp->status());
            Log::warning('CinetPay init failed', ['payload' => $body, 'response' => $json]);
            return ['ok' => false, 'error' => $err, 'raw' => $json];
        } catch (\Throwable $e) {
            Log::warning('CinetPay HTTP exception', ['err' => $e->getMessage()]);
            return ['ok' => false, 'error' => 'Erreur réseau : ' . $e->getMessage()];
        }
    }

    /**
     * Vérification anti-fraude 2 étapes (sécurité #H3 audit) :
     *  1. Signature HMAC-SHA256 du payload avec la secret_key CinetPay
     *     → empêche un attaquant de forger un webhook depuis n'importe où.
     *  2. Rappel /check à CinetPay pour confirmer statut réel.
     *
     * Sans (1), un attaquant qui connaît un order_code (visible côté user)
     * pouvait POST /webhooks/cinetpay avec cpm_result=00 et valider un
     * paiement gratuit. Avec (1), il faut aussi connaître la secret_key.
     */
    public function verifyWebhook(array $payload, array $headers = []): bool
    {
        // ─── Étape 1 : signature HMAC ────────────────────────────
        // CinetPay v2 envoie le HMAC dans le header `x-token` ou champ `token`.
        // Format : sha256_hmac(secret_key, cpm_site_id + cpm_trans_id + cpm_trans_date + cpm_amount + cpm_currency)
        $secret = $this->config['secret_key'] ?? null;
        if ($secret) {
            // Normalise les headers (Laravel/Symfony les renvoie en array de values).
            $hdr = fn (string $key) => is_array($headers[$key] ?? null)
                ? ($headers[$key][0] ?? null)
                : ($headers[$key] ?? null);

            $signature = $hdr('x-token')
                ?? $hdr('X-Token')
                ?? $payload['token']
                ?? null;

            $siteId   = $payload['cpm_site_id']   ?? '';
            $transId  = $payload['cpm_trans_id']  ?? '';
            $transDt  = $payload['cpm_trans_date'] ?? '';
            $amount   = $payload['cpm_amount']    ?? '';
            $currency = $payload['cpm_currency']  ?? '';

            $expected = hash_hmac('sha256',
                $siteId . $transId . $transDt . $amount . $currency,
                $secret
            );

            if (! $signature || ! hash_equals($expected, (string) $signature)) {
                Log::warning('CinetPay HMAC signature invalide — webhook rejeté', [
                    'trans_id' => $transId,
                    'ip'       => request()->ip(),
                ]);
                return false;
            }
        }
        // Si pas de secret_key configuré (mode legacy / sandbox), on skip la vérif
        // HMAC mais on garde le rappel /check ci-dessous en 2e défense.

        $transactionId = $payload['cpm_trans_id'] ?? $payload['transaction_id'] ?? null;
        if (! $transactionId) return false;

        // ─── Étape 2 : rappel /check à CinetPay ─────────────────
        try {
            $resp = Http::timeout(10)
                ->acceptJson()
                ->post($this->baseUrl . '/payment/check', [
                    'apikey'         => $this->config['api_key'],
                    'site_id'        => $this->config['site_id'],
                    'transaction_id' => $transactionId,
                ]);

            $json = $resp->json() ?? [];
            // Code 00 = transaction réussie d'après doc CinetPay.
            return ($json['code'] ?? null) === '00'
                && ($json['data']['status'] ?? null) === 'ACCEPTED';
        } catch (\Throwable $e) {
            Log::warning('CinetPay verify failed', ['err' => $e->getMessage()]);
            return false;
        }
    }

    public function parseWebhook(array $payload): array
    {
        // CinetPay envoie en multipart form-data, on récupère via $request->all()
        $isOk = ($payload['cpm_result'] ?? null) === '00';

        return [
            'transaction_id' => $payload['cpm_trans_id'] ?? '',
            'status'         => $isOk ? 'paid' : 'failed',
            'amount_fcfa'    => (int) ($payload['cpm_amount'] ?? 0),
            'gateway_id'     => $payload['cpm_payid'] ?? null,
            'raw'            => $payload,
        ];
    }
}
