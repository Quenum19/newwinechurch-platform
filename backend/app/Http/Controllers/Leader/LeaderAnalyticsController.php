<?php

namespace App\Http\Controllers\Leader;

use App\Http\Controllers\Controller;
use App\Models\CellAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Analytics du leader : évolution présence sur 3 mois (par semaine).
 * Cache 5 min.
 */
class LeaderAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cellId = (int) $request->leader_cell_id;

        $payload = Cache::remember(
            "leader:analytics:{$cellId}",
            now()->addMinutes(5),
            fn () => $this->build($cellId),
        );

        return response()->json($payload);
    }

    protected function build(int $cellId): array
    {
        // ~13 semaines (3 mois).
        $trend = [];
        for ($i = 12; $i >= 0; $i--) {
            $start = now()->subWeeks($i)->startOfWeek();
            $end   = $start->copy()->endOfWeek();

            $agg = CellAttendance::where('cell_id', $cellId)
                ->whereBetween('meeting_date', [$start, $end])
                ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
                ->first();

            $rate = ($agg && $agg->total > 0)
                ? round(($agg->present_sum / $agg->total) * 100, 1)
                : 0.0;

            $trend[] = [
                'week'        => $start->isoFormat('DD/MM'),
                'week_start'  => $start->toDateString(),
                'rate'        => $rate,
                'present'     => (int) ($agg->present_sum ?? 0),
                'total'       => (int) ($agg->total ?? 0),
            ];
        }

        return [
            'cell_id'         => $cellId,
            'attendance_trend'=> $trend,
            'generated_at'    => now()->toIso8601String(),
        ];
    }
}
