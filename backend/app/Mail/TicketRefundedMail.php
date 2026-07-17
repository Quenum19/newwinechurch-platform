<?php

namespace App\Mail;

use App\Models\EventTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 6 — Mail "Ticket remboursé / annulé" envoyé à l'inscrit.
 *
 * Cas payés : explique le montant remboursé + délai de réception sur le n° utilisé
 * pour l'inscription (ou contact si discord).
 * Cas gratuits : juste informer de l'annulation.
 */
class TicketRefundedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public EventTicket $ticket,
        public string $reason,
        public bool $isOrderLevel = false,
    ) {}

    public function envelope(): Envelope
    {
        $title = $this->ticket->event?->title ?? 'New Wine Church';
        $verb  = $this->ticket->refund_amount_fcfa > 0 ? 'Remboursement' : 'Annulation';
        return new Envelope(subject: "$verb — $title");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tickets.refunded',
            with: [
                'ticket'       => $this->ticket,
                'event'        => $this->ticket->event,
                'reason'       => $this->reason,
                'isPaid'       => $this->ticket->refund_amount_fcfa > 0,
                'isOrderLevel' => $this->isOrderLevel,
            ],
        );
    }
}
