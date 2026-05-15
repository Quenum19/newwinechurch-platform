<?php

namespace App\Http\Controllers\Leader;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leader\StoreCellAttendanceRequest;
use App\Http\Resources\Leader\CellAttendanceResource;
use App\Models\Cell;
use App\Models\CellAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Présences cellule.
 *
 * - store : batch upsert pour une meeting_date donnée. Doublons évités par
 *   l'index unique (cell_id, member_id, meeting_date).
 * - index : historique paginé par DATE (10 réunions par page max).
 */
class LeaderAttendanceController extends Controller
{
    public function store(StoreCellAttendanceRequest $request): JsonResponse
    {
        $cellId = (int) $request->leader_cell_id;
        $meetingDate = $request->validated('meeting_date');
        $attendances = $request->validated('attendances');

        $cell = Cell::with('leader:id,department_id')->findOrFail($cellId);

        // Vérifier que tous les member_id appartiennent bien à la cellule.
        $memberIds = collect($attendances)->pluck('member_id')->unique()->all();
        $validMembers = $cell->members()->whereIn('users.id', $memberIds)->pluck('users.id')->all();
        $invalid = array_diff($memberIds, $validMembers);
        if (! empty($invalid)) {
            return response()->json([
                'message' => 'Certains membres ne font pas partie de la cellule.',
                'invalid_member_ids' => array_values($invalid),
            ], 422);
        }

        $now = now();
        $rows = [];
        foreach ($attendances as $a) {
            $rows[] = [
                'cell_id'      => $cellId,
                'member_id'    => (int) $a['member_id'],
                'meeting_date' => $meetingDate,
                'is_present'   => (bool) $a['is_present'],
                'arrived_late' => (bool) ($a['arrived_late'] ?? false),
                'note'         => $a['note'] ?? null,
                'recorded_by'  => $request->user()->id,
                'created_at'   => $now,
                'updated_at'   => $now,
            ];
        }

        DB::transaction(function () use ($rows) {
            // upsert : insert si nouveau, update sur clé unique sinon.
            DB::table('cell_attendance')->upsert(
                $rows,
                ['cell_id', 'member_id', 'meeting_date'],
                ['is_present', 'arrived_late', 'note', 'recorded_by', 'updated_at']
            );
        });

        // Invalide les caches dashboards (leader + gouverneur du dept du leader).
        Cache::forget(LeaderDashboardController::cacheKey($cellId));
        $leaderDeptId = $cell->leader?->department_id;
        if ($leaderDeptId) {
            Cache::forget(\App\Http\Controllers\Governor\GovernorDashboardController::cacheKey($leaderDeptId));
        }

        activity('cell_attendance')
            ->causedBy($request->user())
            ->performedOn($cell)
            ->withProperties(['meeting_date' => $meetingDate, 'count' => count($rows)])
            ->log('Présences cellule enregistrées');

        return response()->json([
            'message'   => 'Présences enregistrées.',
            'meeting_date' => $meetingDate,
            'recorded_count' => count($rows),
        ], 201);
    }

    public function index(Request $request)
    {
        $cellId = (int) $request->leader_cell_id;

        $query = CellAttendance::where('cell_id', $cellId)
            ->with('member:id,name,first_name,avatar');

        if ($from = $request->query('date_from')) {
            $query->where('meeting_date', '>=', $from);
        }
        if ($to = $request->query('date_to')) {
            $query->where('meeting_date', '<=', $to);
        }

        $query->orderByDesc('meeting_date');

        // 10 réunions par page = ~120 lignes max sur une cellule à 12 membres.
        // En cursor pagination, c'est plus stable sur mobile.
        $perPage = min((int) $request->query('per_page', 50), 200);
        return CellAttendanceResource::collection($query->cursorPaginate($perPage));
    }
}
