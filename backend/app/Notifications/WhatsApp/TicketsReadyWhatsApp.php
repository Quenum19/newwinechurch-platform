<?php

namespace App\Notifications\WhatsApp;

use App\Models\EventTicket;
use App\Services\WhatsApp\WhatsAppService;

/**
 * Phase 3 — Notif WhatsApp après validation paiement (Phase 2).
 *
 * Template attendu (Meta Business Manager) :
 *   ✅ Paiement validé pour {{1}} !
 *   Tu peux maintenant accéder à ton ticket : {{2}}
 *   À très vite ! — NWC
 *
 *   → params : [event_title, my_ticket_url]
 */
class TicketsReadyWhatsApp
{
    public function __construct(private EventTicket $ticket) {}

    public function send(WhatsAppService $service): array
    {
        $event = $this->ticket->event;
        $url = rtrim(config('app.frontend_url', config('app.url')), '/')
             . '/mon-ticket/' . $this->ticket->access_token;

        return $service->sendToTicket($this->ticket, 'tickets_ready', [
            $event?->title ?? 'New Wine Church',
            $url,
        ]);
    }
}
