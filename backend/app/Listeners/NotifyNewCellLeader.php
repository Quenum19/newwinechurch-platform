<?php

namespace App\Listeners;

use App\Events\CellLeaderAssigned;
use App\Notifications\CellLeaderAppointedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;

/**
 * Notifie le nouveau leader + invalide le cache dashboard de la cellule.
 */
class NotifyNewCellLeader implements ShouldQueue
{
    public function handle(CellLeaderAssigned $event): void
    {
        $event->leader->notify(
            new CellLeaderAppointedNotification($event->cell, $event->assignedBy)
        );

        Cache::forget(\App\Http\Controllers\Leader\LeaderDashboardController::cacheKey($event->cell->id));
    }
}
