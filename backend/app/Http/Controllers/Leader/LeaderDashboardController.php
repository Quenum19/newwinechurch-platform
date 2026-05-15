<?php

namespace App\Http\Controllers\Leader;

use App\Http\Controllers\Controller;
use App\Http\Resources\Leader\LeaderDashboardResource;
use App\Models\Cell;
use App\Models\CellAttendance;
use App\Models\CellReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Dashboard du leader de cellule — KPIs synthétiques.
 *
 * Données : nombre de membres, taux de présence ce mois, statut du dernier
 * rapport, prochaine réunion, présences à la dernière réunion, nombre de
 * rapports manquants sur 8 dernières semaines.
 *
 * Cache 60s par cellule.
 */
class LeaderDashboardController extends Controller
{
    public function index(Request $request)
    {
        $cellId = (int) $request->leader_cell_id;

        $payload = Cache::remember(
            self::cacheKey($cellId),
            now()->addSeconds(60),
            fn () => $this->build($cellId),
        );

        return new LeaderDashboardResource($payload);
    }

    public static function cacheKey(int $cellId): string
    {
        return "leader:dashboard:{$cellId}";
    }

    protected function build(int $cellId): array
    {
        $cell = Cell::find($cellId);
        if (! $cell) {
            return ['cell' => null];
        }

        $membersCount = $cell->members()->count();

        // Taux de présence ce mois.
        $monthStart = now()->startOfMonth();
        $att = CellAttendance::where('cell_id', $cellId)
            ->where('meeting_date', '>=', $monthStart)
            ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
            ->first();
        $attendanceMonth = ($att && $att->total > 0)
            ? round(($att->present_sum / $att->total) * 100, 1)
            : 0.0;

        // Dernier rapport.
        $lastReport = CellReport::where('cell_id', $cellId)
            ->orderByDesc('week_start')
            ->first(['status', 'week_start']);

        // Dernière réunion et nb présents à cette réunion.
        $lastMeetingDate = CellAttendance::where('cell_id', $cellId)
            ->max('meeting_date');
        $presentLastMeeting = $lastMeetingDate
            ? CellAttendance::where('cell_id', $cellId)
                ->where('meeting_date', $lastMeetingDate)
                ->where('is_present', true)
                ->count()
            : 0;

        // Rapports manquants sur 8 dernières semaines (semaines sans rapport submitted).
        $submittedWeeks = CellReport::where('cell_id', $cellId)
            ->where('status', '!=', 'draft')
            ->where('week_start', '>=', now()->subWeeks(8)->startOfWeek())
            ->pluck('week_start')
            ->map(fn ($d) => \Carbon\Carbon::parse($d)->toDateString())
            ->all();
        $missing = 0;
        for ($i = 0; $i < 8; $i++) {
            $weekStart = now()->subWeeks($i)->startOfWeek()->toDateString();
            if (! in_array($weekStart, $submittedWeeks, true)) {
                $missing++;
            }
        }

        // Prochaine réunion : si meeting_day défini, calculer la prochaine occurrence.
        $nextMeeting = null;
        if ($cell->meeting_day) {
            $daysMap = [
                'lundi' => 1, 'mardi' => 2, 'mercredi' => 3, 'jeudi' => 4,
                'vendredi' => 5, 'samedi' => 6, 'dimanche' => 0,
            ];
            $targetDow = $daysMap[$cell->meeting_day] ?? null;
            if ($targetDow !== null) {
                $next = now()->copy();
                while ($next->dayOfWeek !== $targetDow) {
                    $next->addDay();
                }
                $nextMeeting = $next->toDateString();
            }
        }

        return [
            'cell' => [
                'id'           => $cell->id,
                'name'         => $cell->name,
                'meeting_day'  => $cell->meeting_day,
                'meeting_time' => $cell->meeting_time?->format('H:i'),
            ],
            'members_count'                => $membersCount,
            'attendance_this_month'        => $attendanceMonth,
            'members_present_last_meeting' => $presentLastMeeting,
            'missing_reports_count'        => $missing,
            'last_report_status'           => $lastReport?->status,
            'next_meeting_date'            => $nextMeeting,
        ];
    }
}
