<?php

namespace App\Mail;

use App\Models\DepartmentReport;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Mail — Notification de rapport soumis AVEC le PDF officiel attaché.
 *
 * Audiences supportées :
 *  - pasteur   : "Nouveau rapport à approuver"
 *  - rh        : "Rapport disponible pour consultation"
 *  - governor  : "Confirmation de soumission" (accusé)
 *
 * Le sujet, le titre du mail et le call-to-action varient selon l'audience.
 */
class DepartmentReportSubmittedWithPdfMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public DepartmentReport $report,
        public User $recipient,
        public string $audience,   // 'pasteur' | 'rh' | 'governor'
        public string $pdfPath,
        public string $downloadName,
    ) {}

    public function envelope(): Envelope
    {
        $dept = $this->report->department?->name ?? 'Département';

        $subject = match ($this->audience) {
            'pasteur'  => "Nouveau rapport à approuver — {$dept}",
            'rh'       => "Rapport département soumis — {$dept}",
            'governor' => "Confirmation : votre rapport a été soumis — {$dept}",
            default    => "Rapport département — {$dept}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reports.department_submitted_with_pdf',
            with: [
                'report'     => $this->report->loadMissing(['department', 'governor']),
                'recipient'  => $this->recipient,
                'audience'   => $this->audience,
                'department' => $this->report->department,
                'governor'   => $this->report->governor,
                'adminUrl'   => rtrim(config('app.url'), '/').'/admin/rapports-departement/'.$this->report->id,
                'govUrl'     => rtrim(config('app.url'), '/').'/gouverneur/rapports/'.$this->report->id,
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
