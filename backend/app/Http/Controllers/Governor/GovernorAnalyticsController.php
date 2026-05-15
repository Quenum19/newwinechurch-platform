<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\CellAttendance;
use App\Models\DepartmentReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Analytics du département : graphes 12 mois, taux présence cellules,
 * top 3 cellules actives.
 *
 * Cache 5 min (les données analytics changent peu à l'échelle minute).
 */
class GovernorAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $deptId = (int) $request->governor_department_id;

        $payload = Cache::remember(
            "governor:analytics:{$deptId}",
            now()->addMinutes(5),
            fn () => $this->build($deptId),
        );

        return response()->json($payload);
    }

    protected function build(int $deptId): array
    {
        // === 1. Membres par mois (12 derniers mois) — pivot department_user.created_at ===
        $membersByMonth = [];
        for ($i = 11; $i >= 0; $i--) {
            $monthRef = now()->subMonths($i);
            $count = DB::table('department_user')
                ->where('department_id', $deptId)
                ->where('created_at', '<=', $monthRef->endOfMonth())
                ->count();
            $membersByMonth[] = [
                'month' => $monthRef->isoFormat('MMM YYYY'),
                'count' => $count,
            ];
        }

        // === 2. Taux de présence par cellule (4 dernières semaines) ===
        $cellsAttendance = Cell::whereHas('leader', fn ($q) => $q->where('department_id', $deptId))
            ->where('is_active', true)
            ->select('id', 'name')
            ->addSelect([
                'attendance_rate' => DB::table('cell_attendance')
                    ->selectRaw('ROUND(SUM(is_present) / NULLIF(COUNT(*), 0) * 100, 1)')
                    ->whereColumn('cell_attendance.cell_id', 'cells.id')
                    ->where('meeting_date', '>=', now()->subWeeks(4)),
            ])
            ->orderBy('name')
            ->limit(50)
            ->get();

        // === 3. Rapports soumis / approuvés par mois (12 mois) ===
        $reportsByMonth = [];
        for ($i = 11; $i >= 0; $i--) {
            $monthRef = now()->subMonths($i)->startOfMonth();
            $end = $monthRef->copy()->endOfMonth();
            $base = DepartmentReport::where('department_id', $deptId)
                ->whereBetween('submitted_at', [$monthRef, $end]);
            $reportsByMonth[] = [
                'month'    => $monthRef->isoFormat('MMM YYYY'),
                'submitted'=> (clone $base)->whereIn('status', ['submitted', 'reviewed', 'approved'])->count(),
                'approved' => (clone $base)->where('status', 'approved')->count(),
            ];
        }

        // === 4. Top 3 cellules les plus actives (par nombre de rapports soumis 3 mois) ===
        $top3 = Cell::whereHas('leader', fn ($q) => $q->where('department_id', $deptId))
            ->where('is_active', true)
            ->withCount(['reports as recent_reports_count' => function ($q) {
                $q->where('status', '!=', 'draft')
                  ->where('submitted_at', '>=', now()->subMonths(3));
            }])
            ->orderByDesc('recent_reports_count')
            ->limit(3)
            ->get(['id', 'name', 'zone'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'zone' => $c->zone,
                'recent_reports_count' => $c->recent_reports_count,
            ]);

        return [
            'department_id'          => $deptId,
            'members_by_month'       => $membersByMonth,
            'cells_attendance_rates' => $cellsAttendance,
            'reports_by_month'       => $reportsByMonth,
            'top_cells'              => $top3,
            'generated_at'           => now()->toIso8601String(),
        ];
    }
}
