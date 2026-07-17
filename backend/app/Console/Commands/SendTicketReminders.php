<?php

namespace App\Console\Commands;

use App\Mail\TicketIssuedMail;
use App\Models\EventTicket;
use App\Notifications\WhatsApp\EventReminderWhatsApp;
use App\Services\TicketIssuer;
use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Console\Command;

/**
 * Envoie un rappel J-1 à 18h pour les events ticketés du lendemain.
 *
 * Cron : daily at 18:00 (à configurer dans schedule).
 * Ré-envoie le même mail/PDF du ticket pour rappeler à la personne.
 *
 * Idempotent : pour éviter de spammer si la commande tourne 2x, on ne renvoie
 * que les tickets confirmés non encore utilisés.
 */
class SendTicketReminders extends Command
{
    protected $signature = 'tickets:remind-day-before';
    protected $description = 'Renvoie le ticket aux inscrits dont l\'event est demain.';

    public function handle(TicketIssuer $issuer, WhatsAppService $whatsapp): int
    {
        $tomorrowStart = now()->copy()->addDay()->startOfDay();
        $tomorrowEnd   = now()->copy()->addDay()->endOfDay();

        $tickets = EventTicket::with('event')
            ->where('status', 'confirmed')
            ->whereIn('payment_status', ['free', 'paid']) // Phase 2 : pending → pas de rappel
            ->whereHas('event', function ($q) use ($tomorrowStart, $tomorrowEnd) {
                $q->whereBetween('starts_at', [$tomorrowStart, $tomorrowEnd])
                  ->where('ticketing_enabled', true);
            })
            ->get();

        $this->info("Envoi rappels J-1 pour {$tickets->count()} ticket(s).");

        $sent = 0;
        $wa = 0;
        // On regroupe par order_code pour n'envoyer qu'1 WhatsApp par commande
        // (le mail reste envoyé par ticket pour que chaque holder ait son QR).
        $ordersNotified = [];
        foreach ($tickets as $ticket) {
            $r = $issuer->issueAndSend($ticket);
            if ($r['sent']) $sent++;

            if (! in_array($ticket->order_code, $ordersNotified, true)) {
                $rw = (new EventReminderWhatsApp($ticket))->send($whatsapp);
                if ($rw['ok'] ?? false) $wa++;
                $ordersNotified[] = $ticket->order_code;
            }
        }

        $this->info("✅ $sent rappel(s) mail envoyé(s) · $wa WhatsApp.");
        return self::SUCCESS;
    }
}
