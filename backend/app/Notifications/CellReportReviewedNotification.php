<?php

namespace App\Notifications;

use App\Models\CellReport;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification : rapport cellule revu (reviewed / approved / rejected).
 * Destinataire : le leader qui a soumis.
 */
class CellReportReviewedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public CellReport $report,
    ) {}

    public function via(User $notifiable): array
    {
        $channels = ['database'];
        if ($notifiable->notificationChannels('reports', 'email')) {
            $channels[] = 'mail';
        }
        if ($notifiable->notificationChannels('reports', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $r = $this->report->loadMissing(['cell', 'reviewer']);
        $isApproved = $r->status === 'approved';
        $isRejected = $r->status === 'rejected';

        $subject = $isApproved ? "✅ Rapport cellule approuvé — {$r->cell?->name}"
                  : ($isRejected ? "⚠ Rapport cellule à corriger — {$r->cell?->name}"
                  : "📋 Rapport cellule revu — {$r->cell?->name}");

        return (new MailMessage())
            ->subject($subject)
            ->view('emails.reports.cell_reviewed', [
                'recipient'  => $notifiable,
                'report'     => $r,
                'cell'       => $r->cell,
                'isApproved' => $isApproved,
                'isRejected' => $isRejected,
                'reviewer'   => $r->reviewer,
                'url'        => rtrim(config('app.url'), '/').'/leader/rapports/'.$r->id,
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'           => 'cell_report_reviewed',
            'report_id'      => $this->report->id,
            'cell_id'        => $this->report->cell_id,
            'status'         => $this->report->status,
            'review_comment' => $this->report->review_comment,
            'reviewed_at'    => $this->report->reviewed_at?->toIso8601String(),
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'           => 'cell_report_reviewed',
            'report_id'      => $this->report->id,
            'cell_id'        => $this->report->cell_id,
            'cell_name'      => $this->report->cell?->name,
            'status'         => $this->report->status,
            'review_comment' => $this->report->review_comment,
        ];
    }
}
