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
 * Notification urgente : rapport département en retard (J+7 après period_end).
 * Envoyée au gouverneur (et au pasteur en alerte).
 */
class ReportOverdueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public DepartmentReport $report,
    ) {}

    public function via(User $notifiable): array
    {
        // Email forcé même si désactivé : c'est une alerte urgente.
        // Broadcast suit la préférence.
        $channels = ['database', 'mail'];
        if ($notifiable->notificationChannels('reports', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $r = $this->report->loadMissing('department');
        $daysLate = max(0, (int) now()->diffInDays($r->period_end, true) - 7);

        return (new MailMessage())
            ->subject("[URGENT] Rapport en retard — {$r->department?->name}")
            ->view('emails.reports.department_overdue', [
                'recipient'  => $notifiable,
                'report'     => $r,
                'department' => $r->department,
                'daysLate'   => $daysLate,
                'url'        => rtrim(config('app.url'), '/').'/gouverneur/rapports/'.$r->id,
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'         => 'report_overdue',
            'severity'     => 'urgent',
            'report_id'    => $this->report->id,
            'dept_id'      => $this->report->department_id,
            'dept_name'    => $this->report->department?->name,
            'period_end'   => $this->report->period_end?->toDateString(),
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'      => 'report_overdue',
            'severity'  => 'urgent',
            'report_id' => $this->report->id,
            'dept_id'   => $this->report->department_id,
            'dept_name' => $this->report->department?->name,
        ];
    }
}
