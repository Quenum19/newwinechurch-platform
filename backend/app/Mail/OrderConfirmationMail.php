<?php

namespace App\Mail;

use App\Models\EventTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 2 — Mail immédiat après inscription PAYANTE.
 *
 * Contient les instructions Mobile Money (numéro à composer, montant exact,
 * référence à mentionner = order_code) + lien suivi commande.
 * AUCUN QR ni PDF — ils seront envoyés via TicketIssuedMail UNE FOIS le paiement validé.
 */
class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        /** @var \Illuminate\Support\Collection<int, EventTicket> Tous les tickets de la commande */
        public $tickets,
        /** @var array<int, array> Annuaire des méthodes Mobile Money actives */
        public array $paymentMethods,
        public int $totalFcfa,
        public string $orderTrackingUrl,
    ) {}

    public function envelope(): Envelope
    {
        $event = $this->tickets->first()?->event;
        return new Envelope(
            subject: 'Commande reçue — ' . ($event?->title ?? 'New Wine Church'),
        );
    }

    public function content(): Content
    {
        $first = $this->tickets->first();
        return new Content(
            view: 'emails.tickets.order-confirmation',
            with: [
                'tickets'         => $this->tickets,
                'event'           => $first?->event,
                'orderCode'       => $first?->order_code,
                'totalFcfa'       => $this->totalFcfa,
                'paymentMethods'  => $this->paymentMethods,
                'orderTrackingUrl'=> $this->orderTrackingUrl,
                'expiresAt'       => $first?->payment_expires_at,
            ],
        );
    }
}
