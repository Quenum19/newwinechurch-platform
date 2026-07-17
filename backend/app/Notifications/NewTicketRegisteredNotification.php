<?php

namespace App\Notifications;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification envoyée aux MANAGERS + ADMINS quand un nouvel inscrit
 * reçoit son ticket. Uniquement database + broadcast (pas de mail — on
 * évite le spam, l'inscrit lui-même reçoit déjà son mail avec PDF).
 */
class NewTicketRegisteredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Event $event,
        public EventTicket $ticket,
        public int $orderTotal, // nombre de tickets dans la commande
    ) {}

    public function via(User $notifiable): array
    {
        $channels = ['database'];
        if ($notifiable->notificationChannels('appointment', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload());
    }

    public function toArray(User $notifiable): array
    {
        return $this->payload();
    }

    protected function payload(): array
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');
        $fullName = trim(($this->ticket->first_name ?? '') . ' ' . ($this->ticket->last_name ?? ''));

        return [
            'type'        => 'new_ticket_registered',
            'title'       => "Nouvelle inscription — {$this->event->title}",
            'body'        => $this->orderTotal > 1
                ? "{$fullName} vient de prendre {$this->orderTotal} tickets."
                : "{$fullName} vient de s'inscrire.",
            'event_id'    => $this->event->id,
            'event_title' => $this->event->title,
            'ticket_id'   => $this->ticket->id,
            'order_code'  => $this->ticket->order_code,
            'buyer_name'  => $fullName,
            'quantity'    => $this->orderTotal,
            'url'         => $frontend . '/mission/evenement/' . $this->event->id,
        ];
    }
}
