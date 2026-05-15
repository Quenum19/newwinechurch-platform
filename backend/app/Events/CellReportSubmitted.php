<?php

namespace App\Events;

use App\Models\CellReport;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CellReportSubmitted
{
    use Dispatchable, SerializesModels;

    public function __construct(public CellReport $report) {}
}
