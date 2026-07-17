<?php

namespace App\Notifications\WhatsApp;

use App\Models\EventTicket;
use App\Services\WhatsApp\WhatsAppService;

/**
 * Phase 6 — Notif WhatsApp après remboursement / annulation.
 *
 * Template attendu (à approuver côté Meta — voir memory whatsapp-meta-setup) :
 *   nwc_refund_notification — params [first_name, event_title, amount_text, support_phone]
 *
 * En mode log (driver dev), aucune approbation Meta nécessaire — les logs montrent
 * exactement ce qui aurait été envoyé.
 */
class TicketRefundedWhatsApp
{
    public function __construct(
        private EventTicket $ticket,
        private string $reason,
    ) {}

    public function send(WhatsAppService $service): array
    {
        $event = $this->ticket->event;
        $amount = $this->ticket->refund_amount_fcfa;
        $amountText = $amount > 0
            ? number_format($amount, 0, ',', ' ') . ' FCFA remboursés'
            : 'Inscription annulée';

        // Si le template "refund" n'est pas configuré côté Meta, on tombe sur
        // 'inscription' (déjà approuvé Phase 3) avec un message rebrand.
        // L'admin peut renommer dans config/whatsapp.php quand son template
        // dédié sera approuvé.
        $templateKey = config('whatsapp.templates.refund') ? 'refund' : 'inscription';

        return $service->sendToTicket($this->ticket, $templateKey, [
            $this->ticket->first_name,
            $event?->title ?? 'NWC',
            $this->ticket->order_code,
            $amountText . '. Raison : ' . $this->reason,
            $event?->support_phone ?? '',
        ]);
    }
}
