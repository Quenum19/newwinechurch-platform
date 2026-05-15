<?php

namespace App\Listeners;

use App\Events\CellReportSubmitted;
use App\Models\User;
use App\Notifications\CellReportSubmittedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Notifie le(s) gouverneur(s) du département du leader + le staff
 * quand un rapport hebdo de cellule est soumis.
 */
class NotifyGovernorOnCellReport implements ShouldQueue
{
    public function handle(CellReportSubmitted $event): void
    {
        $report = $event->report->loadMissing(['cell.leader', 'leader']);
        $leaderDeptId = $report->cell?->leader?->department_id;

        $recipients = collect();

        // Gouverneurs actifs du département du leader (s'il en a un).
        if ($leaderDeptId) {
            $governorIds = DB::table('department_governors')
                ->where('department_id', $leaderDeptId)
                ->whereNull('ended_at')
                ->pluck('user_id');
            if ($governorIds->isNotEmpty()) {
                $recipients = $recipients->merge(
                    User::whereIn('id', $governorIds)->where('status', 'active')->get()
                );
            }
        }

        // Pasteur + admins (vue d'ensemble).
        $recipients = $recipients->merge(
            User::role(['pasteur', 'admin', 'superadmin'])
                ->where('status', 'active')
                ->get()
        );

        $recipients = $recipients->unique('id');
        if ($recipients->isEmpty()) return;

        Notification::send($recipients, new CellReportSubmittedNotification($report));
    }
}
