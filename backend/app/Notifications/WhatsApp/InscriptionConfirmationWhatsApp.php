<?php

namespace App\Notifications\WhatsApp;

use App\Models\EventTicket;
use App\Services\WhatsApp\WhatsAppService;

/**
 * Phase 3 — Notif WhatsApp envoyée après inscription billetterie.
 *
 *  Gratuit (Phase 1)  → "Ton ticket {short_code} est dispo"
 *  Payant  (Phase 2)  → "Commande {order_code} reçue, paie {montant} FCFA"
 *
 * Le service résout les params {{1}}, {{2}}… selon ce que tu as configuré
 * côté Meta Business Manager pour le template `nwc_inscription_confirmation`.
 *
 * Format recommandé du template (à valider côté Meta) :
 *   Bonjour {{1}}, ton inscription pour {{2}} est confirmée.
 *   N° commande : {{3}}. {{4}}
 *   Voir : {{5}}
 *
 *   → params : [first_name, event_title, order_code, payment_line, tracking_url]
 */
class InscriptionConfirmationWhatsApp
{
    public function __construct(
        private EventTicket $ticket,
        private int $totalFcfa = 0,
        private ?string $orderTrackingUrl = null,
    ) {}

    public function send(WhatsAppService $service): array
    {
        $event = $this->ticket->event;
        $isPaid = $this->totalFcfa > 0;

        $paymentLine = $isPaid
            ? "Montant à régler : " . number_format($this->totalFcfa, 0, ',', ' ') . " FCFA via Mobile Money."
            : "Ton ticket est prêt — consulte ta boîte mail.";

        $url = $this->orderTrackingUrl ?? (
            rtrim(config('app.frontend_url', config('app.url')), '/')
            . ($isPaid
                ? '/ma-commande/' . $this->ticket->order_code
                : '/mon-ticket/' . $this->ticket->access_token)
        );

        return $service->sendToTicket($this->ticket, 'inscription', [
            $this->ticket->first_name,
            $event?->title ?? 'New Wine Church',
            $this->ticket->order_code,
            $paymentLine,
            $url,
        ]);
    }
}
