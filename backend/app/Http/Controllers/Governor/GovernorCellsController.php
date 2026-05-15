<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Governor\AssignCellLeaderRequest;
use App\Http\Requests\Governor\StoreGovernorCellRequest;
use App\Http\Requests\Governor\UpdateGovernorCellRequest;
use App\Http\Resources\Governor\CellWithStatsResource;
use App\Models\Cell;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Cellules dans le périmètre du gouverneur authentifié.
 *
 * Scope : cellules dont le leader fait partie du département du gouverneur
 * (users.department_id = $request->governor_department_id).
 */
class GovernorCellsController extends Controller
{
    public function index(Request $request)
    {
        $deptId = (int) $request->governor_department_id;

        // Cellules + stats agrégées (1 seule passe via subqueries, pas N+1).
        $query = Cell::query()
            ->whereHas('leader', fn ($q) => $q->where('department_id', $deptId))
            ->with('leader:id,name,first_name,avatar,phone,department_id')
            ->withCount('members')
            ->addSelect([
                'last_report_date' => DB::table('cell_reports')
                    ->select('week_start')
                    ->whereColumn('cell_reports.cell_id', 'cells.id')
                    ->orderByDesc('week_start')
                    ->limit(1),
                'attendance_rate_4w' => DB::table('cell_attendance')
                    ->selectRaw('ROUND(SUM(is_present) / NULLIF(COUNT(*), 0) * 100, 1)')
                    ->whereColumn('cell_attendance.cell_id', 'cells.id')
                    ->where('meeting_date', '>=', now()->subWeeks(4)),
            ])
            ->orderByDesc('is_active')
            ->orderBy('name');

        $perPage = min((int) $request->query('per_page', 30), 100);
        return CellWithStatsResource::collection($query->cursorPaginate($perPage));
    }

    public function store(StoreGovernorCellRequest $request)
    {
        $deptId = (int) $request->governor_department_id;
        $data = $request->validated();

        // Vérification métier : le leader désigné doit appartenir au département.
        $leader = User::find($data['leader_id']);
        if (! $leader || $leader->department_id !== $deptId) {
            return response()->json([
                'message' => 'Le leader désigné doit appartenir à votre département.',
            ], 422);
        }

        $cell = DB::transaction(function () use ($data, $leader, $request) {
            // Generate slug from name (collision-proof).
            $slug = \Illuminate\Support\Str::slug($data['name']);
            if (Cell::where('slug', $slug)->exists()) {
                $slug .= '-'.\Illuminate\Support\Str::random(4);
            }

            $cell = Cell::create(array_merge($data, [
                'slug'      => $slug,
                'status'    => 'active',
                'is_active' => $data['is_active'] ?? true,
            ]));

            // Le leader devient membre + rôle leader.
            DB::table('cell_user')->insertOrIgnore([
                'cell_id'    => $cell->id,
                'user_id'    => $leader->id,
                'role'       => 'leader',
                'joined_at'  => now()->toDateString(),
                'is_convert' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (! $leader->hasRole('leader')) {
                $leader->assignRole('leader');
            }
            $leader->update([
                'is_cell_leader' => true,
                'cell_id'        => $cell->id,
            ]);

            // Mandat actif dans cell_leaders.
            DB::table('cell_leaders')->insert([
                'cell_id'      => $cell->id,
                'user_id'      => $leader->id,
                'is_primary'   => true,
                'appointed_at' => now()->toDateString(),
                'ended_at'     => null,
                'appointed_by' => $request->user()->id,
                'notes'        => null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            return $cell;
        });

        activity('cells')
            ->causedBy($request->user())
            ->performedOn($cell)
            ->withProperties(['leader_id' => $leader->id, 'department_id' => $deptId])
            ->log('Cellule créée par gouverneur');

        // Fire event : NotifyNewCellLeader s'abonne (notif inbox + email + broadcast).
        \App\Events\CellLeaderAssigned::dispatch($leader, $cell, $request->user());

        Cache::forget(GovernorDashboardController::cacheKey($deptId));

        return new CellWithStatsResource($cell->loadCount('members')->load('leader'));
    }

    public function update(UpdateGovernorCellRequest $request, int $id)
    {
        $deptId = (int) $request->governor_department_id;

        // Scope : la cellule doit avoir un leader du département du gouverneur.
        $cell = Cell::with('leader:id,department_id')->findOrFail($id);
        if (! $cell->leader || $cell->leader->department_id !== $deptId) {
            return response()->json([
                'message' => 'Cellule hors de votre périmètre.',
            ], 403);
        }

        $cell->fill($request->validated())->save();

        Cache::forget(GovernorDashboardController::cacheKey($deptId));

        return new CellWithStatsResource($cell->fresh()->loadCount('members')->load('leader'));
    }

    /**
     * Assigner un leader à une cellule.
     * Transaction : clôture l'ancien mandat + crée le nouveau.
     */
    public function assignLeader(AssignCellLeaderRequest $request, int $id): JsonResponse
    {
        $deptId = (int) $request->governor_department_id;
        $newLeaderId = (int) $request->input('user_id');

        $cell = Cell::with('leader:id,department_id')->findOrFail($id);

        // Scope départemental : cellule actuelle dans le périmètre.
        if ($cell->leader && $cell->leader->department_id !== $deptId) {
            return response()->json(['message' => 'Cellule hors de votre périmètre.'], 403);
        }

        // Nouveau leader doit aussi être du département.
        $newLeader = User::findOrFail($newLeaderId);
        if ($newLeader->department_id !== $deptId) {
            return response()->json([
                'message' => 'Le nouveau leader doit appartenir à votre département.',
            ], 422);
        }

        DB::transaction(function () use ($cell, $newLeader, $request, $deptId) {
            $oldLeaderId = $cell->leader_id;

            // Clôture mandat ancien.
            if ($oldLeaderId && $oldLeaderId !== $newLeader->id) {
                DB::table('cell_leaders')
                    ->where('cell_id', $cell->id)
                    ->where('user_id', $oldLeaderId)
                    ->whereNull('ended_at')
                    ->update(['ended_at' => now()->toDateString(), 'updated_at' => now()]);

                // Décache is_cell_leader si plus aucun mandat actif.
                $stillLeader = DB::table('cell_leaders')
                    ->where('user_id', $oldLeaderId)
                    ->whereNull('ended_at')
                    ->exists();
                if (! $stillLeader) {
                    User::where('id', $oldLeaderId)->update(['is_cell_leader' => false]);
                }

                // Pivot cell_user : ancien repasse en member.
                DB::table('cell_user')
                    ->where('cell_id', $cell->id)
                    ->where('user_id', $oldLeaderId)
                    ->update(['role' => 'member', 'updated_at' => now()]);
            }

            // Met à jour le cache leader_id.
            $cell->update(['leader_id' => $newLeader->id]);

            // Nouveau mandat.
            DB::table('cell_leaders')->insert([
                'cell_id'      => $cell->id,
                'user_id'      => $newLeader->id,
                'is_primary'   => true,
                'appointed_at' => now()->toDateString(),
                'ended_at'     => null,
                'appointed_by' => $request->user()->id,
                'notes'        => $request->input('notes'),
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // Sync pivot cell_user pour le nouveau.
            DB::table('cell_user')->updateOrInsert(
                ['cell_id' => $cell->id, 'user_id' => $newLeader->id],
                [
                    'role'       => 'leader',
                    'joined_at'  => now()->toDateString(),
                    'is_convert' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Rôle Spatie + flag.
            if (! $newLeader->hasRole('leader')) {
                $newLeader->assignRole('leader');
            }
            $newLeader->update([
                'is_cell_leader' => true,
                'cell_id'        => $cell->id,
            ]);
        });

        activity('cells')
            ->causedBy($request->user())
            ->performedOn($cell)
            ->withProperties(['new_leader_id' => $newLeader->id])
            ->log('Leader cellule réassigné par gouverneur');

        // Fire event : NotifyNewCellLeader s'abonne.
        \App\Events\CellLeaderAssigned::dispatch($newLeader, $cell, $request->user());

        Cache::forget(GovernorDashboardController::cacheKey($deptId));

        return response()->json([
            'message' => 'Leader assigné.',
            'data'    => new CellWithStatsResource($cell->fresh()->loadCount('members')->load('leader')),
        ]);
    }
}
