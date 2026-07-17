<?php

namespace App\Services\Payment\Contracts;

/**
 * Contrat commun à tous les drivers de passerelle paiement (CinetPay, Stub, …).
 *
 * 3 méthodes :
 *  - initiate()       : démarre une transaction → retourne URL de paiement
 *  - verifyWebhook()  : vérifie l'authenticité d'un callback (signature, etc.)
 *  - parseWebhook()   : extrait les infos utiles d'un payload
 */
interface PaymentGatewayDriver
{
    /**
     * Démarre un paiement.
     *
     * @param array{
     *   transaction_id: string,   // Notre order_code
     *   amount_fcfa: int,          // Montant FCFA total
     *   description: string,       // Libellé visible côté checkout
     *   customer_name: string,
     *   customer_email: string,
     *   customer_phone: string,
     *   return_url?: string,       // Override la config si besoin
     * } $payload
     *
     * @return array{
     *   ok: bool,
     *   payment_url?: string,      // URL où rediriger l'inscrit
     *   payment_token?: string,    // Token de session (utile pour /check)
     *   error?: string,
     *   raw?: array,
     * }
     */
    public function initiate(array $payload): array;

    /**
     * Vérifie qu'un payload webhook vient bien du provider.
     * À implémenter avec signature HMAC, whitelist IP, ou appel /check.
     */
    public function verifyWebhook(array $payload, array $headers = []): bool;

    /**
     * Normalise le payload webhook en un format commun.
     *
     * @return array{
     *   transaction_id: string,    // Notre order_code
     *   status: string,            // 'paid' | 'failed' | 'pending'
     *   amount_fcfa: int,
     *   gateway_id?: string,        // ID interne du provider
     *   raw: array,
     * }
     */
    public function parseWebhook(array $payload): array;

    public function name(): string;
}
