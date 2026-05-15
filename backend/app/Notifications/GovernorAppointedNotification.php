<?php

namespace App\Notifications;

use App\Models\Department;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Onboarding : un user vient d'être nommé gouverneur d'un département.
 */
class GovernorAppointedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Department $department,
        public ?User $appointedBy = null,
    ) {}

    public function via(User $notifiable): array
    {
        $channels = ['database', 'mail']; // bienvenue : email systématique
        if ($notifiable->notificationChannels('appointment', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject("Nomination — Gouverneur de « {$this->department->name} »")
            ->view('emails.onboarding.governor_appointed', [
                'recipient'   => $notifiable,
                'department'  => $this->department,
                'appointedBy' => $this->appointedBy,
                'url'         => rtrim(config('app.url'), '/').'/gouverneur',
                'pastorEmail' => config('mail.from.address', 'pasteur@newinechurch.org'),
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'      => 'governor_appointed',
            'dept_id'   => $this->department->id,
            'dept_name' => $this->department->name,
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'      => 'governor_appointed',
            'dept_id'   => $this->department->id,
            'dept_name' => $this->department->name,
        ];
    }
}
