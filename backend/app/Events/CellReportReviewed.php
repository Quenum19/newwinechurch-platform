<?php

namespace App\Events;

use App\Models\CellReport;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event — Un rapport cellule a été revu (reviewed / approved / rejected).
 * Listeners : LogReportActivity + NotifyLeaderOnCellReportReviewed.
 */
class CellReportReviewed
{
    use Dispatchable, SerializesModels;

    public function __construct(public CellReport $report) {}
}
