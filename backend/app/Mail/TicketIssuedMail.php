<?php

namespace App\Mail;

use App\Models\EventTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Mail envoyé à l'inscrit avec son ticket.
 *
 * Embed QR inline (CID) + PDF attaché en double sécurité.
 * Pas en queue → envoi SYNC pour avoir un retour immédiat.
 */
class TicketIssuedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public EventTicket $ticket,
        /** @var string Chemin temp du PDF généré */
        public string $pdfPath,
        /** @var string|null Chemin temp du PNG QR (null si imagick non dispo) */
        public ?string $qrPngPath = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Ton ticket — ' . $this->ticket->event->title,
        );
    }

    public function content(): Content
    {
        // SVG QR généré à la volée → base64 inline directement dans le template.
        // Si un PNG temp existe, on l'utilise prioritairement (rendu plus net).
        $qrSvg = QrCode::format('svg')
            ->size(500)->margin(1)->errorCorrection('M')
            ->generate($this->ticket->qr_payload);

        return new Content(
            view: 'emails.tickets.issued',
            with: [
                'ticket'      => $this->ticket,
                'event'       => $this->ticket->event,
                'qrSvgInline' => $qrSvg,
                'myTicketUrl' => rtrim(config('app.frontend_url', config('app.url')), '/')
                              . '/mon-ticket/' . $this->ticket->access_token,
            ],
        );
    }

    public function attachments(): array
    {
        // Si le PDF n'a pas pu être généré, on envoie sans pièce jointe :
        // le QR + short_code inline dans le mail suffisent pour scanner à l'entrée.
        if (! $this->pdfPath || ! file_exists($this->pdfPath)) {
            return [];
        }
        return [
            Attachment::fromPath($this->pdfPath)
                ->as('Ticket-NWC-' . $this->ticket->short_code . '.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
