<?php

namespace App\Jobs;

use App\Models\Cell;
use App\Models\CellAttendance;
use App\Models\CellReport;
use App\Models\Department;
use App\Models\DepartmentReport;
use App\Models\User;
use App\Notifications\WeeklyDigestNotification;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Job vendredi 17h : envoi du digest hebdomadaire.
 *
 *  - Pour le(s) pasteur(s) : vue NWC globale.
 *  - Pour chaque gouverneur actif : digest de SON département.
 */
class SendWeeklyDepartmentDigestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600;

    public function __construct(public ?string $weekStartOverride = null) {}

    public function handle(): void
    {
        $weekStart = $this->weekStartOverride
            ? Carbon::parse($this->weekStartOverride)->startOfWeek()
            : now()->startOfWeek();
        $weekEnd = $weekStart->copy()->endOfWeek();

        // === 1) Digest pasteur ===
        $pastors = User::role('pasteur')->where('status', 'active')->get();
        if ($pastors->isNotEmpty()) {
            $payload = $this->buildPastorPayload($weekStart, $weekEnd);
            foreach ($pastors as $pastor) {
                $pastor->notify(new WeeklyDigestNotification($payload));
            }
        }

        // === 2) Digest par gouverneur ===
        $activeMandates = DB::table('department_governors')
            ->whereNull('ended_at')
            ->where('is_primary', true)
            ->select('user_id', 'department_id')
            ->get();

        foreach ($activeMandates as $m) {
            $gov = User::find($m->user_id);
            $dept = Department::find($m->department_id);
            if (! $gov || ! $dept) continue;

            $payload = $this->buildGovernorPayload($dept, $weekStart, $weekEnd);
            $gov->notify(new WeeklyDigestNotification($payload));
        }

        Log::info('SendWeeklyDepartmentDigestJob: terminé', [
            'week_start'        => $weekStart->toDateString(),
            'pastors_count'     => $pastors->count(),
            'governors_count'   => $activeMandates->count(),
        ]);
    }

    protected function buildPastorPayload(Carbon $weekStart, Carbon $weekEnd): array
    {
        $reportsSubmitted = DepartmentReport::whereBetween('submitted_at', [$weekStart, $weekEnd])
            ->whereIn('status', ['submitted', 'reviewed', 'approved'])
            ->count();
        $reportsExpected  = Department::where('status', 'active')->whereNotNull('governor_id')->count();

        $attendanceAgg = CellAttendance::whereBetween('meeting_date', [$weekStart, $weekEnd])
            ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
            ->first();
        $attendanceAvg = ($attendanceAgg && $attendanceAgg->total > 0)
            ? round(($attendanceAgg->present_sum / $attendanceAgg->total) * 100, 1)
            : 0.0;

        $newMembersCount = DB::table('users')
            ->whereBetween('joined_at', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->count();

        $latePending = DepartmentReport::whereIn('status', ['submitted', 'draft'])
            ->where('period_end', '<', now()->subDays(7))
            ->count();

        $cellsMissing = Cell::where('is_active', true)
            ->whereDoesntHave('reports', function ($q) use ($weekStart, $weekEnd) {
                $q->whereBetween('week_start', [$weekStart->copy()->subWeek(), $weekEnd->copy()->subWeek()])
                  ->where('status', '!=', 'draft');
            })
            ->count();

        // Top par département.
        $departments = Department::where('status', 'active')
            ->withCount(['reports as reports_count' => function ($q) use ($weekStart, $weekEnd) {
                $q->whereBetween('submitted_at', [$weekStart, $weekEnd]);
            }])
            ->get(['id', 'name'])
            ->map(function ($d) {
                $cellsCount = Cell::whereHas('leader', fn ($q) => $q->where('department_id', $d->id))->count();
                return [
                    'id'            => $d->id,
                    'name'          => $d->name,
                    'reports_count' => $d->reports_count,
                    'cells_count'   => $cellsCount,
                ];
            });

        return [
            'scope'             => 'pastor',
            'week_start'        => $weekStart->toDateString(),
            'week_end'          => $weekEnd->toDateString(),
            'reports_submitted' => $reportsSubmitted,
            'reports_expected'  => $reportsExpected,
            'attendance_avg'    => $attendanceAvg,
            'new_members_count' => $newMembersCount,
            'alerts'            => [
                ['type' => 'late_reports',  'label' => 'rapport(s) en retard', 'count' => $latePending],
                ['type' => 'missing_cells', 'label' => 'cellule(s) sans rapport hebdo', 'count' => $cellsMissing],
            ],
            'departments'       => $departments->toArray(),
        ];
    }

    protected function buildGovernorPayload(Department $dept, Carbon $weekStart, Carbon $weekEnd): array
    {
        $cellsScope = Cell::whereHas('leader', fn ($q) => $q->where('department_id', $dept->id));

        $reportsSubmitted = CellReport::whereIn('cell_id', (clone $cellsScope)->pluck('id'))
            ->whereBetween('week_start', [$weekStart->copy()->subWeek(), $weekEnd->copy()->subWeek()])
            ->where('status', '!=', 'draft')
            ->count();
        $reportsExpected = (clone $cellsScope)->where('is_active', true)->count();

        $attendanceAgg = CellAttendance::whereIn('cell_id', (clone $cellsScope)->pluck('id'))
            ->whereBetween('meeting_date', [$weekStart, $weekEnd])
            ->selectRaw('SUM(is_present) as present_sum, COUNT(*) as total')
            ->first();
        $attendanceAvg = ($attendanceAgg && $attendanceAgg->total > 0)
            ? round(($attendanceAgg->present_sum / $attendanceAgg->total) * 100, 1)
            : 0.0;

        $newMembersCount = DB::table('users')
            ->where('department_id', $dept->id)
            ->whereBetween('joined_at', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->count();

        return [
            'scope'             => 'governor',
            'dept_id'           => $dept->id,
            'dept_name'         => $dept->name,
            'week_start'        => $weekStart->toDateString(),
            'week_end'          => $weekEnd->toDateString(),
            'reports_submitted' => $reportsSubmitted,
            'reports_expected'  => $reportsExpected,
            'attendance_avg'    => $attendanceAvg,
            'new_members_count' => $newMembersCount,
            'alerts'            => [],
        ];
    }
}
