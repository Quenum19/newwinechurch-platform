<?php

namespace App\Listeners;

use App\Events\GovernorAssigned;
use App\Notifications\GovernorAppointedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;

/**
 * Notifie le nouveau gouverneur + invalide le cache dashboard du département.
 * Remplace l'envoi manuel de GovernorAppointedMail dans AdminGovernorsController.
 */
class NotifyNewGovernor implements ShouldQueue
{
    public function handle(GovernorAssigned $event): void
    {
        $event->governor->notify(
            new GovernorAppointedNotification($event->department, $event->assignedBy)
        );

        // Invalide le dashboard du département (un nouveau gouverneur = nouvelle vue).
        Cache::forget(\App\Http\Controllers\Governor\GovernorDashboardController::cacheKey($event->department->id));
    }
}
