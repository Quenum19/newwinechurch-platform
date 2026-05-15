<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Governor\GovernorDashboardResource;
use App\Models\Cell;
use App\Models\CellAttendance;
use App\Models\CellReport;
use App\Models\Department;
use App\Models\DepartmentReport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard du gouverneur — KPIs + tendances + santé des cellules.
 *
 * Cache 60s par département pour éviter de tout recalculer à chaque visite.
 * Invalidation : faite par les controllers qui modifient l'état (rapports
 * soumis, attendances, etc.).
 */
class GovernorDashboardController extends Controller
{
    public function index(Request $request)
    {
        $deptId = (int) $request->governor_department_id;

        $payload = Cache::remember(
            self::cacheKey($deptId),
            now()->addSeconds(60),
            fn () => $this->build($deptId),
        );

        return new GovernorDashboardResource($payload);
    }

    /** Clé de cache utilisée par les autres controllers pour invalider. */
    public static function cacheKey(int $deptId): string
    {
        return "governor:dashboard:{$deptId}";
    }

    /** Construit le payload complet du dashboard (lourd — donc caché). */
    protected function build(int $deptId): array
    {
        $dept = Department::find($deptId);
        if (! $dept) {
            return ['department' => null];
        }

        // Cellules du département (via leader.department_id — cf décisions Étape 2).
        $cellsQuery = Cell::query()
            ->whereHas('leader', fn ($q) => $q->where('department_id', $deptId));

        $cellsCount       = (clone $cellsQuery)->count();
        $activeCellsCount = (clone $cellsQuery)->where('is_active', true)->count();

        // Membres : ceux du département via le pivot department_user.
        $membersCount = $dept->members()->count();

        // Rapports en attente / en retard.
        $reportsPending = DepartmentReport::where('department_id', $deptId)
            ->where('status', 'submitted')
            ->count();
        $reportsLate = DepartmentReport::where('department_id', $deptId)
            ->whereIn('status', ['draft', 'submitted'])
            ->where('period_end', '<', now()->subDays(7))
            ->count();

        // Taux de présence moyen sur les 4 dernières semaines.
        $fourWeeksAgo = now()->subWeeks(4)->startOfDay();
        $att4w = CellAttendance::whereHas('cell.leader', fn ($q) => $q->where('department_id', $deptId))
            ->where('meeting_date', '>=', $fourWeeksAgo)
            ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
            ->first();
        $attendanceAvg = ($att4w && $att4w->total > 0)
            ? round(($att4w->present_sum / $att4w->total) * 100, 1)
            : 0.0;

        // Tendance membres : 3 mois (count cumulé du department à fin de mois).
        $membersTrend = [];
        for ($i = 2; $i >= 0; $i--) {
            $end = now()->subMonths($i)->endOfMonth();
            $count = DB::table('department_user')
                ->where('department_id', $deptId)
                ->where('created_at', '<=', $end)
                ->count();
            $membersTrend[] = [
                'month' => $end->isoFormat('MMM YYYY'),
                'count' => $count,
            ];
        }

        // Tendance présence : taux par semaine sur 8 semaines.
        $attendanceTrend = [];
        for ($i = 7; $i >= 0; $i--) {
            $weekStart = now()->subWeeks($i)->startOfWeek();
            $weekEnd   = $weekStart->copy()->endOfWeek();
            $agg = CellAttendance::whereHas('cell.leader', fn ($q) => $q->where('department_id', $deptId))
                ->whereBetween('meeting_date', [$weekStart, $weekEnd])
                ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
                ->first();
            $rate = ($agg && $agg->total > 0)
                ? round(($agg->present_sum / $agg->total) * 100, 1)
                : 0.0;
            $attendanceTrend[] = [
                'week' => $weekStart->isoFormat('DD/MM'),
                'rate' => $rate,
            ];
        }

        // Santé par cellule : 1 requête + 1 agrégat par cellule (limité aux actives).
        $cellsHealth = (clone $cellsQuery)
            ->where('is_active', true)
            ->with('leader:id,name,first_name')
            ->limit(50)
            ->get()
            ->map(function (Cell $cell) use ($fourWeeksAgo) {
                $lastReport = CellReport::where('cell_id', $cell->id)
                    ->orderByDesc('week_start')
                    ->first(['week_start', 'status']);

                $att = CellAttendance::where('cell_id', $cell->id)
                    ->where('meeting_date', '>=', $fourWeeksAgo)
                    ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
                    ->first();
                $rate = ($att && $att->total > 0)
                    ? round(($att->present_sum / $att->total) * 100, 1)
                    : null;

                $daysSinceReport = $lastReport
                    ? now()->diffInDays(Carbon::parse($lastReport->week_start))
                    : 999;

                $status = 'good';
                if ($rate !== null && $rate < 50) $status = 'critical';
                elseif ($daysSinceReport > 14)     $status = 'critical';
                elseif ($rate !== null && $rate < 75) $status = 'warning';
                elseif ($daysSinceReport > 7)      $status = 'warning';

                return [
                    'cell_id'          => $cell->id,
                    'cell_name'        => $cell->name,
                    'leader_name'      => $cell->leader?->full_name,
                    'last_report_date' => $lastReport?->week_start,
                    'attendance_rate'  => $rate,
                    'status'           => $status,
                ];
            });

        return [
            'department' => [
                'id'   => $dept->id,
                'name' => $dept->name,
                'slug' => $dept->slug,
            ],
            'members_count'              => $membersCount,
            'cells_count'                => $cellsCount,
            'active_cells_count'         => $activeCellsCount,
            'reports_pending_count'      => $reportsPending,
            'reports_late_count'         => $reportsLate,
            'attendance_avg_last_4_weeks'=> $attendanceAvg,
            'members_trend'              => $membersTrend,
            'attendance_trend'           => $attendanceTrend,
            'cells_health'               => $cellsHealth,
            'cached_until'               => now()->addSeconds(60)->toIso8601String(),
        ];
    }
}
