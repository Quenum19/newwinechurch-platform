<?php

namespace App\Notifications\WhatsApp;

use App\Models\EventTicket;
use App\Services\WhatsApp\WhatsAppService;

/**
 * Phase 3 — Notif WhatsApp J-1 (cron 18h).
 *
 * Template attendu (Meta Business Manager) :
 *   📅 Rappel : {{1}} c'est demain !
 *   🕐 {{2}} · 📍 {{3}}
 *   Ton ticket : {{4}}
 *
 *   → params : [event_title, datetime_text, location, my_ticket_url]
 */
class EventReminderWhatsApp
{
    public function __construct(private EventTicket $ticket) {}

    public function send(WhatsAppService $service): array
    {
        $event = $this->ticket->event;
        $startsAt = $event?->starts_at?->locale('fr')->isoFormat("D MMM [à] HH[h]mm") ?? '—';
        $location = $event?->location ?? 'Lieu communiqué prochainement';
        $url = rtrim(config('app.frontend_url', config('app.url')), '/')
             . '/mon-ticket/' . $this->ticket->access_token;

        return $service->sendToTicket($this->ticket, 'reminder', [
            $event?->title ?? 'Notre événement',
            $startsAt,
            $location,
            $url,
        ]);
    }
}
