<?php

namespace App\Listeners;

use App\Events\CellReportReviewed;
use App\Events\CellReportSubmitted;
use App\Events\DepartmentReportReviewed;
use App\Events\DepartmentReportSubmitted;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Trace dans Spatie ActivityLog la soumission/revue d'un rapport.
 * Listener générique : signe les 3 events liés rapports.
 */
class LogReportActivity implements ShouldQueue
{
    public function handle(object $event): void
    {
        if ($event instanceof DepartmentReportSubmitted) {
            activity('reports')
                ->performedOn($event->report)
                ->causedBy($event->report->governor)
                ->withProperties(['department_id' => $event->report->department_id])
                ->log('Rapport département soumis');
        } elseif ($event instanceof DepartmentReportReviewed) {
            activity('reports')
                ->performedOn($event->report)
                ->causedBy($event->report->reviewer)
                ->withProperties([
                    'department_id' => $event->report->department_id,
                    'status'        => $event->report->status,
                ])
                ->log('Rapport département revu');
        } elseif ($event instanceof CellReportSubmitted) {
            activity('cell_reports')
                ->performedOn($event->report)
                ->causedBy($event->report->leader)
                ->withProperties(['cell_id' => $event->report->cell_id])
                ->log('Rapport cellule soumis');
        } elseif ($event instanceof CellReportReviewed) {
            activity('cell_reports')
                ->performedOn($event->report)
                ->causedBy($event->report->reviewer)
                ->withProperties([
                    'cell_id' => $event->report->cell_id,
                    'status'  => $event->report->status,
                ])
                ->log('Rapport cellule revu');
        }
    }
}
