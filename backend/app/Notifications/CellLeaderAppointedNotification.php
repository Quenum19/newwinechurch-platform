<?php

namespace App\Notifications;

use App\Models\Cell;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Onboarding : nomination d'un leader de cellule.
 */
class CellLeaderAppointedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Cell $cell,
        public ?User $appointedBy = null,
    ) {}

    public function via(User $notifiable): array
    {
        $channels = ['database', 'mail'];
        if ($notifiable->notificationChannels('appointment', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $cell = $this->cell->loadMissing('members');
        $membersCount = $cell->members->count();

        return (new MailMessage())
            ->subject("Nomination — Leader de la cellule « {$this->cell->name} »")
            ->view('emails.onboarding.leader_appointed', [
                'recipient'    => $notifiable,
                'cell'         => $cell,
                'membersCount' => $membersCount,
                'appointedBy'  => $this->appointedBy,
                'url'          => rtrim(config('app.url'), '/').'/leader',
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'      => 'cell_leader_appointed',
            'cell_id'   => $this->cell->id,
            'cell_name' => $this->cell->name,
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'      => 'cell_leader_appointed',
            'cell_id'   => $this->cell->id,
            'cell_name' => $this->cell->name,
        ];
    }
}
