<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Digest hebdomadaire envoyé au pasteur (et optionnellement aux gouverneurs).
 * Le payload est pré-calculé par SendWeeklyDepartmentDigestJob.
 */
class WeeklyDigestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param array $payload Structure :
     *   {
     *     week_start, week_end, scope ('pastor'|'governor'),
     *     dept_id?, dept_name?,
     *     reports_submitted, reports_expected,
     *     attendance_avg, new_members_count,
     *     alerts: [{type, label, count}],
     *     departments?: [{id, name, status, ...}] (scope=pastor)
     *   }
     */
    public function __construct(public array $payload) {}

    public function via(User $notifiable): array
    {
        return $notifiable->notificationChannels('digest', 'email')
            ? ['database', 'mail']
            : ['database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $scope = $this->payload['scope'] ?? 'pastor';
        $subject = $scope === 'governor'
            ? "📈 Digest hebdo — {$this->payload['dept_name']}"
            : "📈 Digest hebdo NWC — Vue pasteur";

        return (new MailMessage())
            ->subject($subject)
            ->view('emails.digest.weekly_pastor', [
                'recipient' => $notifiable,
                'data'      => $this->payload,
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'        => 'weekly_digest',
            'scope'       => $this->payload['scope'] ?? 'pastor',
            'week_start'  => $this->payload['week_start'] ?? null,
            'week_end'    => $this->payload['week_end'] ?? null,
        ];
    }
}
