<?php

namespace App\Mail;

use App\Models\EventTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 2 — Mail envoyé à l'inscrit quand son paiement est refusé par l'admin.
 *
 * La raison du refus est obligatoire (transparence + traçabilité).
 * Le contact support (téléphone event) est mis en avant pour réessayer.
 */
class PaymentRefusedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public EventTicket $ticket,
        public string $reason,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Paiement non confirmé — ' . $this->ticket->event->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tickets.payment-refused',
            with: [
                'ticket' => $this->ticket,
                'event'  => $this->ticket->event,
                'reason' => $this->reason,
            ],
        );
    }
}
