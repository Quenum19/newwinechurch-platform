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
 * Notification : cellule sans rapport hebdo soumis.
 *
 * Niveau d'urgence selon le nombre de semaines manquantes :
 *  - 1 semaine : rappel doux (gentle)
 *  - >= 2 semaines : rappel urgent (urgent) + notif au gouverneur du dept.
 */
class CellMissingReportNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Cell $cell,
        public int $weeksMissing = 1,
        /** array de date YYYY-MM-DD des semaines manquantes (lundi). */
        public array $missingWeekStarts = [],
    ) {}

    public function via(User $notifiable): array
    {
        $channels = ['database', 'mail'];
        if ($notifiable->notificationChannels('reports', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toMail(User $notifiable): MailMessage
    {
        $isUrgent = $this->weeksMissing >= 2;

        return (new MailMessage())
            ->subject(($isUrgent ? '[URGENT] ' : '')
                    . "Rapport hebdomadaire manquant — {$this->cell->name}")
            ->view('emails.reports.cell_missing', [
                'recipient'         => $notifiable,
                'cell'              => $this->cell,
                'weeksMissing'      => $this->weeksMissing,
                'missingWeekStarts' => $this->missingWeekStarts,
                'isUrgent'          => $isUrgent,
                'url'               => rtrim(config('app.url'), '/').'/leader/rapports/nouveau',
            ]);
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type'           => 'cell_missing_report',
            'severity'       => $this->weeksMissing >= 2 ? 'urgent' : 'warning',
            'cell_id'        => $this->cell->id,
            'cell_name'      => $this->cell->name,
            'weeks_missing'  => $this->weeksMissing,
        ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'          => 'cell_missing_report',
            'cell_id'       => $this->cell->id,
            'cell_name'     => $this->cell->name,
            'weeks_missing' => $this->weeksMissing,
        ];
    }
}
