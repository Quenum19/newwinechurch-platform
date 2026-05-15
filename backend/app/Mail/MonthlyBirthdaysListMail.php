<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Mail mensuel envoyé à la RH avec la liste PDF des anniversaires du mois.
 */
class MonthlyBirthdaysListMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $recipient,
        public string $monthName,
        public int $count,
        public string $pdfPath,
        public string $downloadName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🎂 Anniversaires du mois — {$this->monthName} ({$this->count} membres)",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reports.monthly_birthdays',
            with: [
                'recipient' => $this->recipient,
                'monthName' => $this->monthName,
                'count'     => $this->count,
            ],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->pdfPath)
                ->as($this->downloadName)
                ->withMime('application/pdf'),
        ];
    }
}
