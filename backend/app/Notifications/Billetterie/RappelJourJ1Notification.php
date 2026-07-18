<?php

namespace App\Notifications\Billetterie;

use App\Models\EventTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Sprint B — #5 Rappel J-1 (24h avant event).
 *
 * Destinataire : ticket holder (email via AnonymousNotifiable OU User linked).
 * Idempotence : le flag reminders_j1_sent_at est posé côté command (SendEventJ1Reminders).
 */
class RappelJourJ1Notification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public EventTicket $ticket) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $event = $this->ticket->event;
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        // QR SVG inline base64 (aucun binaire nécessaire côté worker).
        $qrPayload = $this->ticket->qr_payload ?: $this->ticket->ticket_number;
        try {
            $svg = QrCode::format('svg')->size(220)->margin(1)->errorCorrection('M')
                ->generate($qrPayload);
            $qrDataUri = 'data:image/svg+xml;base64,' . base64_encode($svg);
        } catch (\Throwable) {
            $qrDataUri = null;
        }

        return (new MailMessage())
            ->subject("⏰ C'est demain — {$event->title}")
            ->view('emails.billetterie.rappel_j1', [
                'ticket'    => $this->ticket,
                'event'     => $event,
                'qr_data'   => $qrDataUri,
                'ticket_url'=> $frontend . '/ma-billetterie/' . ($this->ticket->access_token ?? ''),
            ]);
    }
}
