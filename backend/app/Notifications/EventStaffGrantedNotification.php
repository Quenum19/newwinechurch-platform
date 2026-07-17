<?php

namespace App\Notifications;

use App\Models\Event;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Étape F — Notification quand un user reçoit un grant event_staff.
 *
 * Multi-canal :
 *  - mail       : template sobre `emails.staff.granted` (déjà existant)
 *  - database   : ligne dans notifications → apparaît dans le NotificationCenter
 *  - broadcast  : temps réel via Reverb (si user opt-in)
 */
class EventStaffGrantedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Event $event,
        public string $grant,
        public ?User $assigner = null,
    ) {}

    public function via(User $notifiable): array
    {
        // Skip totalement les guest scanners : ils reçoivent leur magic-link à part.
        if ($notifiable->status === 'guest_scanner' || $notifiable->hasRole('guest-scanner')) {
            return [];
        }
        $channels = ['database', 'mail'];
        if ($notifiable->notificationChannels('appointment', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $subjectPrefix = match ($this->grant) {
            'manager'      => 'Nouvelle mission Manager',
            'scanner_lead' => 'Nouvelle mission Chef sécurité',
            default        => 'Nouvelle mission Scanner',
        };

        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        [$actionUrl, $actionLabel, $mission] = match ($this->grant) {
            'manager' => [
                $frontend . '/mission/evenement/' . $this->event->id,
                'Gérer la billetterie',
                'contrôle total de la billetterie (liste, waitlist, export, staff, remboursements)',
            ],
            'scanner_lead' => [
                $frontend . '/mission/evenement/' . $this->event->id,
                'Panneau Staff & Scanners',
                'gestion des scanners de sécurité (inviter des externes, superviser les scans)',
            ],
            default => [
                $frontend . '/scan?event=' . $this->event->id,
                'Ouvrir le scanner',
                'scanner les tickets à l\'entrée de l\'événement',
            ],
        };

        return (new MailMessage())
            ->subject("{$subjectPrefix} — {$this->event->title}")
            ->view('emails.staff.granted', [
                'user'        => $notifiable,
                'event'       => $this->event,
                'grant'       => $this->grant,
                'assigner'    => $this->assigner,
                'actionUrl'   => $actionUrl,
                'actionLabel' => $actionLabel,
                'mission'     => $mission,
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload($notifiable));
    }

    public function toArray(User $notifiable): array
    {
        return $this->payload($notifiable);
    }

    /**
     * Payload commun DB + broadcast. Le NotificationCenter frontend lit cette
     * structure pour afficher le bell.
     */
    protected function payload(User $notifiable): array
    {
        $labels = [
            'manager'      => 'Manager',
            'scanner_lead' => 'Chef sécurité',
            'scanner'      => 'Scanner',
        ];
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');
        $url = $this->grant === 'scanner'
            ? $frontend . '/scan?event=' . $this->event->id
            : $frontend . '/mission/evenement/' . $this->event->id;

        return [
            'type'        => 'event_staff_granted',
            'title'       => 'Nouvelle mission billetterie',
            'body'        => 'Tu es ' . ($labels[$this->grant] ?? 'Staff') . ' de ' . $this->event->title,
            'event_id'    => $this->event->id,
            'event_title' => $this->event->title,
            'grant'       => $this->grant,
            'grant_label' => $labels[$this->grant] ?? 'Staff',
            'url'         => $url,
            'assigner'    => $this->assigner ? [
                'id'         => $this->assigner->id,
                'first_name' => $this->assigner->first_name,
            ] : null,
        ];
    }
}
