<?php

namespace App\Mail;

use App\Models\Event;
use App\Models\MembershipRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Mail envoyé aux préinscrits pour les inviter à faire leur choix
 * (montagne / atelier / etc. selon le workflow de l'event) via magic-link.
 *
 * Une fois le choix fait → le ticket est généré automatiquement et envoyé
 * dans un second mail (TicketIssuedMail).
 */
class EventChoiceLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Event $event,
        public MembershipRequest $registration,
        public string $choiceUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Choisis ta sphère — ' . $this->event->title,
        );
    }

    public function content(): Content
    {
        // Couleur d'accent : premier ticket_type actif de l'event ou fallback
        $type = $this->event->ticketTypes()->where('is_active', true)->orderBy('sort_order')->first();
        $accent = $type?->color_hex ?: '#8B1A2F';

        return new Content(
            view: 'emails.events.choice-link',
            with: [
                'event'        => $this->event,
                'registration' => $this->registration,
                'choiceUrl'    => $this->choiceUrl,
                'accent'       => $accent,
            ],
        );
    }
}
