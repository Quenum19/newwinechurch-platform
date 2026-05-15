<?php

namespace App\Mail;

use App\Models\CellReport;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Mail — Rapport cellule soumis AVEC PDF officiel attaché.
 *
 * Audiences :
 *  - pasteur  : informatif
 *  - governor : "Un de vos leaders a soumis son rapport"
 *  - leader   : accusé de soumission
 */
class CellReportSubmittedWithPdfMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public CellReport $report,
        public User $recipient,
        public string $audience,  // 'pasteur' | 'governor' | 'leader'
        public string $pdfPath,
        public string $downloadName,
    ) {}

    public function envelope(): Envelope
    {
        $cellName = $this->report->cell?->name ?? 'cellule';

        $subject = match ($this->audience) {
            'pasteur'  => "Rapport cellule soumis — {$cellName}",
            'governor' => "Rapport cellule — {$cellName}",
            'leader'   => "Confirmation : rapport soumis — {$cellName}",
            default    => "Rapport cellule — {$cellName}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reports.cell_submitted_with_pdf',
            with: [
                'report'         => $this->report->loadMissing(['cell', 'leader']),
                'recipient'      => $this->recipient,
                'audience'       => $this->audience,
                'cell'           => $this->report->cell,
                'leader'         => $this->report->leader,
                'attendanceRate' => $this->report->attendanceRate(),
                'adminUrl'       => rtrim(config('app.url'), '/').'/admin/cellules/'.$this->report->cell_id,
                'leaderUrl'      => rtrim(config('app.url'), '/').'/leader/rapports/'.$this->report->id,
                'governorUrl'    => rtrim(config('app.url'), '/').'/gouverneur/cellules/'.$this->report->cell_id,
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
