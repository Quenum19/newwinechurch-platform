<?php

namespace App\Listeners;

use App\Events\DepartmentReportSubmitted;
use App\Models\User;
use App\Notifications\DepartmentReportSubmittedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

/**
 * Listener — notifie pasteur, RH et superadmins quand un rapport département
 * est soumis. Utilise Notification::send() pour fan-out propre.
 */
class NotifyPastorAndHR implements ShouldQueue
{
    public function handle(DepartmentReportSubmitted $event): void
    {
        // Sémantique stricte : pasteur + RH uniquement (admins reçoivent via
        // leurs préférences de notif s'ils s'abonnent, mais ne sont pas la cible).
        $recipients = User::role(['pasteur', 'rh'])
            ->where('status', 'active')
            ->get();

        if ($recipients->isEmpty()) return;

        Notification::send(
            $recipients,
            new DepartmentReportSubmittedNotification($event->report)
        );
    }
}
