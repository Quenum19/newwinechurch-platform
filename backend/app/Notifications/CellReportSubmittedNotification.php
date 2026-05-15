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
 * Notification : un leader a soumis un rapport hebdo de cellule.
 * Destinataires : gouverneur du département du leader + staff.
 */
class CellReportSubmittedNotification extends Notification implements ShouldQueue
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
        $r = $this->report->loadMissing(['cell', 'leader']);

        return (new MailMessage())
            ->subject("📊 Rapport cellule soumis — {$r->cell?->name}")
            ->view('emails.reports.cell_submitted', [
                'recipient'        => $notifiable,
                'report'           => $r,
                'cell'             => $r->cell,
                'leader'           => $r->leader,
                'attendanceRate'   => $r->attendanceRate(),
                'url'              => rtrim(config('app.url'), '/').'/gouverneur/cellules/'.$r->cell_id,
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'             => 'cell_report_submitted',
            'report_id'        => $this->report->id,
            'cell_id'          => $this->report->cell_id,
            'cell_name'        => $this->report->cell?->name,
            'leader'           => $this->report->leader?->full_name,
            'attendance_count' => $this->report->attendance_count,
            'week_start'       => $this->report->week_start?->toDateString(),
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'             => 'cell_report_submitted',
            'report_id'        => $this->report->id,
            'cell_id'          => $this->report->cell_id,
            'cell_name'        => $this->report->cell?->name,
            'attendance_count' => $this->report->attendance_count,
            'week_start'       => $this->report->week_start?->toDateString(),
        ];
    }
}
