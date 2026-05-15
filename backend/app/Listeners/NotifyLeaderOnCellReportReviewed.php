<?php

namespace App\Listeners;

use App\Events\CellReportReviewed;
use App\Notifications\CellReportReviewedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

/**
 * Listener — Notifie le leader de la cellule que son rapport a été revu.
 */
class NotifyLeaderOnCellReportReviewed implements ShouldQueue
{
    public function handle(CellReportReviewed $event): void
    {
        $leader = $event->report->leader;
        if (! $leader || $leader->status !== 'active') return;

        Notification::send($leader, new CellReportReviewedNotification($event->report));
    }
}
