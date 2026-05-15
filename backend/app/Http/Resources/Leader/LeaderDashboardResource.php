<?php

namespace App\Http\Resources\Leader;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource du dashboard leader de cellule.
 * resource est un array fourni par le controller.
 */
class LeaderDashboardResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $d = (array) $this->resource;

        return [
            'cell' => [
                'id'           => $d['cell']['id'] ?? null,
                'name'         => $d['cell']['name'] ?? null,
                'meeting_day'  => $d['cell']['meeting_day'] ?? null,
                'meeting_time' => $d['cell']['meeting_time'] ?? null,
            ],
            'kpis' => [
                'members_count'                 => (int) ($d['members_count'] ?? 0),
                'attendance_this_month_rate'    => (float) ($d['attendance_this_month'] ?? 0),
                'members_present_last_meeting'  => (int) ($d['members_present_last_meeting'] ?? 0),
                'missing_reports_count'         => (int) ($d['missing_reports_count'] ?? 0),
                'last_report_status'            => $d['last_report_status'] ?? null,
                'next_meeting_date'             => $d['next_meeting_date'] ?? null,
            ],
        ];
    }
}
