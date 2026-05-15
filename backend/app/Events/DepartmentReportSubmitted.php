<?php

namespace App\Events;

use App\Models\DepartmentReport;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event domain : un gouverneur a soumis un rapport département.
 * Listeners abonnés : LogReportActivity, NotifyPastorAndHR.
 */
class DepartmentReportSubmitted
{
    use Dispatchable, SerializesModels;

    public function __construct(public DepartmentReport $report) {}
}
