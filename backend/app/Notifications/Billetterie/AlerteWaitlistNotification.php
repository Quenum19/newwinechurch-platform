<?php

namespace App\Notifications\Billetterie;

use App\Models\Event;
use App\Models\EventTicketWaitlist;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sprint B — #4 Alerte nouvelle entrée en waitlist.
 *
 * Destinataires : perm `manage event tickets`.
 * Throttle : 30 min / event (BilletterieNotifier).
 */
class AlerteWaitlistNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Event $event,
        public EventTicketWaitlist $entry,
    ) {}

    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');
        $person = trim(($this->entry->first_name ?? '').' '.($this->entry->last_name ?? ''));

        return (new MailMessage())
            ->subject("📋 Waitlist — {$this->event->title}")
            ->view('emails.billetterie.alerte_waitlist', [
                'recipient'  => $notifiable,
                'event'      => $this->event,
                'entry'      => $this->entry,
                'person'     => $person ?: $this->entry->email,
                'position'   => $this->entry->position,
                'url'        => $frontend . '/admin/evenements/' . $this->event->id . '/billetterie?tab=waitlist',
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'        => 'billetterie_alerte_waitlist',
            'title'       => "Nouvelle attente — {$this->event->title}",
            'body'        => trim(($this->entry->first_name ?? '').' '.($this->entry->last_name ?? '')) . " s'est mis en liste d'attente (position {$this->entry->position}).",
            'event_id'    => $this->event->id,
            'waitlist_id' => $this->entry->id,
            'position'    => $this->entry->position,
            'url'         => '/admin/evenements/' . $this->event->id . '/billetterie?tab=waitlist',
        ];
    }
}
