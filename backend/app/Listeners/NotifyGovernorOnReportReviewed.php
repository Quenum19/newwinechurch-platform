<?php

namespace App\Listeners;

use App\Events\DepartmentReportReviewed;
use App\Notifications\DepartmentReportReviewedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Notifie le gouverneur qui a soumis le rapport de la décision (approved /
 * rejected / reviewed).
 */
class NotifyGovernorOnReportReviewed implements ShouldQueue
{
    public function handle(DepartmentReportReviewed $event): void
    {
        $governor = $event->report->governor;
        if (! $governor) return;

        $governor->notify(
            new DepartmentReportReviewedNotification($event->report)
        );
    }
}
