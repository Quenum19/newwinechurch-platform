<?php

namespace App\Notifications\Billetterie;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sprint B — #1 Nouvelle inscription (billetterie).
 *
 * Destinataires : users avec permission `manage event tickets`.
 * Canaux : email + database (queue).
 * Throttle géré par BilletterieNotifier (5 min glissantes / event).
 */
class NouvelleInscriptionAdminNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Event $event,
        public EventTicket $ticket,
        public int $totalSold,
    ) {}

    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $buyer = trim(($this->ticket->first_name ?? '').' '.($this->ticket->last_name ?? ''));
        $capacity = $this->event->tickets_capacity ?: '∞';
        $type = $this->ticket->ticketType?->name ?? 'Standard';
        $price = $this->ticket->price_fcfa
            ? number_format($this->ticket->price_fcfa, 0, ',', ' ') . ' F CFA'
            : 'Gratuit';

        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        return (new MailMessage())
            ->subject("🎟️ Nouvelle inscription — {$this->event->title}")
            ->view('emails.billetterie.nouvelle_inscription', [
                'recipient'   => $notifiable,
                'event'       => $this->event,
                'ticket'      => $this->ticket,
                'buyer_name'  => $buyer ?: $this->ticket->email,
                'type'        => $type,
                'price'       => $price,
                'total_sold'  => $this->totalSold,
                'capacity'    => $capacity,
                'url'         => $frontend . '/admin/evenements/' . $this->event->id . '/billetterie',
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'       => 'billetterie_nouvelle_inscription',
            'title'      => "Nouvelle inscription — {$this->event->title}",
            'body'       => trim(($this->ticket->first_name ?? '').' '.($this->ticket->last_name ?? '')) . " vient de prendre un ticket.",
            'event_id'   => $this->event->id,
            'ticket_id'  => $this->ticket->id,
            'total_sold' => $this->totalSold,
            'capacity'   => $this->event->tickets_capacity,
            'url'        => '/admin/evenements/' . $this->event->id . '/billetterie',
        ];
    }
}
