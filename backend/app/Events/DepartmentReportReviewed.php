<?php

namespace App\Events;

use App\Models\DepartmentReport;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DepartmentReportReviewed
{
    use Dispatchable, SerializesModels;

    public function __construct(public DepartmentReport $report) {}
}
