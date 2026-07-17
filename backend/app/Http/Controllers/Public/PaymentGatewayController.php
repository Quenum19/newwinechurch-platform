<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Payment\PaymentGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Phase 7 — Endpoints publics passerelle paiement.
 *
 *  POST /api/tickets/order/{orderCode}/initiate-payment  → URL CinetPay où rediriger
 *  POST /api/payments/cinetpay/webhook                   → callback CinetPay (no auth)
 *
 * Le webhook est PUBLIC mais le driver vérifie l'authenticité via /check API.
 */
class PaymentGatewayController extends Controller
{
    public function __construct(private PaymentGatewayService $gateway) {}

    /**
     * Démarre un paiement → renvoie l'URL CinetPay.
     * L'inscrit clique sur "Payer en ligne" depuis /ma-commande/{code}.
     */
    public function initiate(string $orderCode): JsonResponse
    {
        $result = $this->gateway->initiateForOrder($orderCode);

        if (! ($result['ok'] ?? false)) {
            return response()->json([
                'message' => $result['error'] ?? 'Initialisation paiement échouée.',
            ], 422);
        }

        return response()->json([
            'payment_url' => $result['payment_url'] ?? null,
            'driver'      => $this->gateway->driverName(),
        ]);
    }

    /**
     * Webhook reçu du provider (CinetPay / Stub).
     *
     * Sécurité : pas d'auth Bearer (CinetPay ne gère pas), on vérifie côté driver
     * en rappelant /check avec notre api_key. Anti-replay : idempotency dans le service.
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        Log::info('Payment webhook received', ['payload' => $payload]);

        $result = $this->gateway->handleWebhook($payload, $request->headers->all());

        // CinetPay attend un 200 même si on rejette pour ne pas retry indéfiniment.
        return response()->json([
            'ok'      => $result['ok'] ?? false,
            'message' => $result['error'] ?? 'OK',
        ], $result['ok'] ? 200 : 422);
    }
}
