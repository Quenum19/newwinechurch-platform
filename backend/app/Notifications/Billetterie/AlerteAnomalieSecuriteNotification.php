<?php

namespace App\Notifications\Billetterie;

use App\Models\Event;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sprint B — #7 Anomalie de sécurité (burst de scans invalides).
 *
 * Destinataires : superadmin uniquement.
 * NON opt-outable : `critical: true` dans config('notifications.preferences').
 * Throttle : 1 mail / heure / IP (BilletterieNotifier).
 */
class AlerteAnomalieSecuriteNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $ip,
        public ?Event $event,
        public int $attempts,
        public \DateTimeInterface $when,
    ) {}

    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        return (new MailMessage())
            ->subject("🚨 Anomalie sécurité billetterie — IP {$this->ip}")
            ->view('emails.billetterie.anomalie_securite', [
                'recipient' => $notifiable,
                'ip'        => $this->ip,
                'event'     => $this->event,
                'attempts'  => $this->attempts,
                'when'      => $this->when,
                'url'       => $frontend . '/admin/activity-log',
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'     => 'billetterie_anomalie_securite',
            'title'    => "Anomalie scan billetterie",
            'body'     => "{$this->attempts} scans invalides depuis {$this->ip} en < 1 min.",
            'ip'       => $this->ip,
            'event_id' => $this->event?->id,
            'when'     => $this->when->format('c'),
            'url'      => '/admin/activity-log',
        ];
    }
}
