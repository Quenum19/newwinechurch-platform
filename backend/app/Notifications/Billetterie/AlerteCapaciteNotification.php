<?php

namespace App\Notifications\Billetterie;

use App\Models\Event;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sprint B — #3 Alerte capacité (80% ou 95% atteint).
 *
 * Destinataires : perm `manage event tickets` + managers scopés à l'event.
 * Idempotence : one-shot par palier via colonnes alert_80_sent_at / alert_95_sent_at.
 */
class AlerteCapaciteNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Event $event,
        public int $threshold,   // 80 ou 95
        public float $rate,       // taux réel (peut dépasser le seuil)
        public int $remaining,
    ) {}

    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');
        $emoji = $this->threshold >= 95 ? '🚨' : '⚠️';

        return (new MailMessage())
            ->subject("{$emoji} Billetterie {$this->threshold}% — {$this->event->title}")
            ->view('emails.billetterie.alerte_capacite', [
                'recipient' => $notifiable,
                'event'     => $this->event,
                'threshold' => $this->threshold,
                'rate'      => $this->rate,
                'remaining' => $this->remaining,
                'url'       => $frontend . '/admin/evenements/' . $this->event->id . '/billetterie',
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'      => 'billetterie_alerte_capacite',
            'title'     => "Palier {$this->threshold}% atteint — {$this->event->title}",
            'body'      => "{$this->remaining} place(s) restante(s). Taux : {$this->rate}%.",
            'event_id'  => $this->event->id,
            'threshold' => $this->threshold,
            'rate'      => $this->rate,
            'url'       => '/admin/evenements/' . $this->event->id . '/billetterie',
        ];
    }
}
