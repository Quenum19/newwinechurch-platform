<?php

namespace App\Mail;

use App\Models\Event;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Mail envoyé à un user à qui on attribue un grant event_staff — Étape F.
 *
 *  - Envoyé pour toute attribution (manuelle via panneau Staff OU auto via
 *    EventObserver quand le créateur devient manager / respo Sécurité devient
 *    scanner_lead).
 *  - Template différencié par grant : bouton d'action, résumé du rôle.
 *  - Non-critique : dispatch en queue pour ne pas ralentir l'API.
 */
class EventStaffGrantedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Event $event,
        public string $grant,
        public ?User $assigner = null,
    ) {}

    public function envelope(): Envelope
    {
        $labels = [
            'manager'      => 'Nouvelle mission Manager',
            'scanner_lead' => 'Nouvelle mission Chef sécurité',
            'scanner'      => 'Nouvelle mission Scanner',
        ];
        $prefix = $labels[$this->grant] ?? 'Nouvelle mission billetterie';
        return new Envelope(subject: "{$prefix} — {$this->event->title}");
    }

    public function content(): Content
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        // Le CTA principal dépend du grant : URL SCOPÉE à cet event (hors admin).
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

        return new Content(
            view: 'emails.staff.granted',
            with: [
                'user'        => $this->user,
                'event'       => $this->event,
                'grant'       => $this->grant,
                'assigner'    => $this->assigner,
                'actionUrl'   => $actionUrl,
                'actionLabel' => $actionLabel,
                'mission'     => $mission,
            ],
        );
    }
}
