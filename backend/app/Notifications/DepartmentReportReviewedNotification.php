<?php

namespace App\Notifications;

use App\Models\DepartmentReport;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification : rapport département revu (approved / rejected / reviewed).
 * Destinataire principal : le gouverneur ayant soumis.
 */
class DepartmentReportReviewedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public DepartmentReport $report,
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
        $r = $this->report->loadMissing(['department', 'reviewer']);
        $isApproved = $r->status === 'approved';
        $isRejected = $r->status === 'rejected';

        $subject = $isApproved ? "✅ Rapport approuvé — {$r->department?->name}"
                  : ($isRejected ? "⚠ Rapport à corriger — {$r->department?->name}"
                  : "📋 Rapport revu — {$r->department?->name}");

        return (new MailMessage())
            ->subject($subject)
            ->view('emails.reports.department_reviewed', [
                'recipient'  => $notifiable,
                'report'     => $r,
                'department' => $r->department,
                'isApproved' => $isApproved,
                'isRejected' => $isRejected,
                'reviewer'   => $r->reviewer,
                'url'        => rtrim(config('app.url'), '/').'/gouverneur/rapports/'.$r->id,
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'           => 'department_report_reviewed',
            'report_id'      => $this->report->id,
            'dept_id'        => $this->report->department_id,
            'status'         => $this->report->status,
            'review_comment' => $this->report->review_comment,
            'reviewed_at'    => $this->report->reviewed_at?->toIso8601String(),
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'           => 'department_report_reviewed',
            'report_id'      => $this->report->id,
            'dept_id'        => $this->report->department_id,
            'dept_name'      => $this->report->department?->name,
            'status'         => $this->report->status,
            'review_comment' => $this->report->review_comment,
        ];
    }
}
