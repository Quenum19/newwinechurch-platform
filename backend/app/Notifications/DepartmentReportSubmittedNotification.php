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
 * Notification : un gouverneur a soumis un rapport département.
 *
 * Destinataires différents (pasteur, RH) → on adapte le contenu du mail
 * via toMail(notifiable). Les préférences user (notification_preferences
 * JSON) filtrent les canaux via via().
 */
class DepartmentReportSubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public DepartmentReport $report,
    ) {}

    /** Canaux selon préférences user (catégorie 'reports'). */
    public function via(User $notifiable): array
    {
        $channels = ['database']; // toujours dans l'inbox
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
        $report   = $this->report->loadMissing(['department', 'governor']);
        $isPasteur= $notifiable->hasRole('pasteur');

        $subject = $isPasteur
            ? "Nouveau rapport soumis — {$report->department->name}"
            : "Rapport disponible — {$report->department->name}";

        return (new MailMessage())
            ->subject($subject)
            ->view('emails.reports.department_submitted', [
                'recipient'  => $notifiable,
                'report'     => $report,
                'department' => $report->department,
                'governor'   => $report->governor,
                'isPasteur'  => $isPasteur,
                'adminUrl'   => rtrim(config('app.url'), '/').'/admin/rapports-departement/'.$report->id,
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'       => 'department_report_submitted',
            'report_id'  => $this->report->id,
            'dept_id'    => $this->report->department_id,
            'dept_name'  => $this->report->department?->name,
            'governor'   => $this->report->governor?->full_name,
            'period'     => [
                'start' => $this->report->period_start?->toDateString(),
                'end'   => $this->report->period_end?->toDateString(),
            ],
            'submitted_at' => $this->report->submitted_at?->toIso8601String(),
        ]);
    }

    /** Payload stocké dans `notifications` (inbox user). */
    public function toArray(User $notifiable): array
    {
        return [
            'type'      => 'department_report_submitted',
            'report_id' => $this->report->id,
            'dept_id'   => $this->report->department_id,
            'dept_name' => $this->report->department?->name,
            'governor'  => $this->report->governor?->full_name,
            'period_end'=> $this->report->period_end?->toDateString(),
        ];
    }
}
