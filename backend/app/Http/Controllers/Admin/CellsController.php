<?php

namespace App\Http\Controllers\Admin;

use App\Events\CellReportReviewed;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCellReportRequest;
use App\Http\Requests\Admin\StoreCellRequest;
use App\Http\Requests\Admin\UpdateCellRequest;
use App\Http\Resources\Admin\AdminCellReportResource;
use App\Jobs\GenerateCellReportPdfJob;
use App\Models\Cell;
use App\Models\CellReport;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

/**
 * Admin → Cellules + rapports hebdomadaires.
 *
 * Scope :
 *  - admin / pasteur / superadmin → tout
 *  - capitaine cellule (leader_id) → uniquement ses cellules + rapports
 *
 * Workflow rapport :
 *  draft → submitted (leader)
 *  submitted → validated (admin)
 */
class CellsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Cell::class);

        $query = Cell::with('leader:id,name,first_name,avatar,department_id')
            ->withCount('members')
            // Subqueries : taux de présence 4 sem + date du dernier rapport.
            // → permet de calculer health_status côté Resource sans N+1.
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
            ]);

        // Capitaine : uniquement ses cellules.
        $user = $request->user();
        if (! $user->hasAnyRole(['superadmin', 'pasteur', 'rh', 'admin'])) {
            $query->where('leader_id', $user->id);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($zone = $request->query('zone')) {
            $query->where('zone', $zone);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where('name', 'like', "%{$search}%");
        }

        $perPage = min((int) $request->query('per_page', 25), 100);
        $paginator = $query->orderBy('name')->paginate($perPage);

        // Tack health_status sur chaque item (calcul léger, ne casse pas la pagination existante).
        $paginator->getCollection()->transform(function ($c) {
            $c->health_status = $this->computeHealthStatus(
                $c->attendance_rate_4w !== null ? (float) $c->attendance_rate_4w : null,
                $c->last_report_date,
            );
            return $c;
        });

        return response()->json(['data' => $paginator]);
    }

    /**
     * Statut santé d'une cellule basé sur le taux de présence + ancienneté du dernier rapport.
     * Identique au calcul de CellWithStatsResource (gouverneur) pour cohérence.
     */
    protected function computeHealthStatus(?float $rate, ?string $lastReportDate): string
    {
        $daysSinceReport = $lastReportDate
            ? now()->diffInDays(\Carbon\Carbon::parse($lastReportDate))
            : 999;

        if ($rate === null && $daysSinceReport > 14) return 'critical';
        if ($rate !== null && $rate < 50) return 'critical';
        if ($daysSinceReport > 14) return 'critical';
        if ($rate !== null && $rate < 75) return 'warning';
        if ($daysSinceReport > 7) return 'warning';
        return 'good';
    }

    public function show(int $id): JsonResponse
    {
        $cell = Cell::with([
            'leader:id,name,first_name,avatar,email,phone',
            'members:id,name,first_name,avatar',
        ])->withCount(['members', 'reports'])->findOrFail($id);

        Gate::authorize('view', $cell);

        return response()->json(['data' => $cell]);
    }

    public function store(StoreCellRequest $request): JsonResponse
    {
        Gate::authorize('create', Cell::class);

        $cell = DB::transaction(function () use ($request) {
            $data = $request->validated();
            $cell = Cell::create($data);

            // Le leader devient automatiquement membre + rôle leader Spatie + flag.
            $cell->members()->syncWithoutDetaching([
                $data['leader_id'] => ['role' => 'leader', 'joined_at' => now()],
            ]);
            $leader = User::find($data['leader_id']);
            if ($leader && ! $leader->hasRole('leader')) {
                $leader->assignRole('leader');
            }
            $leader?->update(['is_cell_leader' => true, 'cell_id' => $cell->id]);

            // Mandat historique cell_leaders.
            DB::table('cell_leaders')->insert([
                'cell_id'      => $cell->id,
                'user_id'      => $data['leader_id'],
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

        // Fire event : NotifyNewCellLeader notifie le nouveau leader.
        if ($cell->leader) {
            \App\Events\CellLeaderAssigned::dispatch($cell->leader, $cell, $request->user());
        }

        return response()->json([
            'message' => 'Cellule créée.',
            'data'    => $cell->load('leader')->loadCount('members'),
        ], 201);
    }

    public function update(UpdateCellRequest $request, int $id): JsonResponse
    {
        $cell = Cell::findOrFail($id);
        Gate::authorize('update', $cell);

        $data = $request->validated();
        $newLeaderId = $data['leader_id'] ?? null;
        $oldLeaderId = $cell->leader_id;

        DB::transaction(function () use ($cell, $data, $newLeaderId, $oldLeaderId, $request) {
            $cell->fill($data)->save();

            // Si le leader change, on déclasse l'ancien et promeut le nouveau.
            if ($newLeaderId && $newLeaderId !== $oldLeaderId) {
                if ($oldLeaderId && $cell->members()->where('users.id', $oldLeaderId)->exists()) {
                    $cell->members()->updateExistingPivot($oldLeaderId, ['role' => 'member']);
                }
                // Clôture l'ancien mandat dans cell_leaders.
                if ($oldLeaderId) {
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
                }

                $cell->members()->syncWithoutDetaching([
                    $newLeaderId => ['role' => 'leader', 'joined_at' => now()],
                ]);
                $newLeader = User::find($newLeaderId);
                if ($newLeader && ! $newLeader->hasRole('leader')) {
                    $newLeader->assignRole('leader');
                }
                $newLeader?->update(['is_cell_leader' => true, 'cell_id' => $cell->id]);

                // Nouveau mandat actif.
                DB::table('cell_leaders')->insert([
                    'cell_id'      => $cell->id,
                    'user_id'      => $newLeaderId,
                    'is_primary'   => true,
                    'appointed_at' => now()->toDateString(),
                    'ended_at'     => null,
                    'appointed_by' => $request->user()->id,
                    'notes'        => null,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }
        });

        // Fire event si un nouveau leader a réellement été nommé.
        if ($newLeaderId && $newLeaderId !== $oldLeaderId) {
            $freshLeader = User::find($newLeaderId);
            if ($freshLeader) {
                \App\Events\CellLeaderAssigned::dispatch($freshLeader, $cell->fresh(), $request->user());
            }
        }

        return response()->json(['data' => $cell->fresh('leader')->loadCount('members')]);
    }

    public function destroy(int $id): JsonResponse
    {
        $cell = Cell::findOrFail($id);
        Gate::authorize('delete', $cell);
        $cell->delete();
        return response()->json(['message' => 'Cellule archivée.']);
    }

    /** Ajouter un membre à la cellule. */
    public function addMember(Request $request, int $id): JsonResponse
    {
        $cell = Cell::findOrFail($id);
        Gate::authorize('update', $cell);

        $data = $request->validate([
            'user_id'    => ['required', 'integer', 'exists:users,id'],
            'is_convert' => ['nullable', 'boolean'],
        ]);

        // Un membre ne peut être que dans une seule cellule à la fois (règle métier).
        DB::transaction(function () use ($cell, $data) {
            $userId = $data['user_id'];
            // Détache des autres cellules sauf si c'est lui le leader d'une autre cellule.
            DB::table('cell_user')
                ->where('user_id', $userId)
                ->where('cell_id', '!=', $cell->id)
                ->where('role', '!=', 'leader')
                ->delete();

            $cell->members()->syncWithoutDetaching([
                $userId => [
                    'role'       => 'member',
                    'joined_at'  => now(),
                    'is_convert' => (bool) ($data['is_convert'] ?? false),
                ],
            ]);
        });

        return response()->json(['message' => 'Membre ajouté à la cellule.']);
    }

    /** Retirer un membre de la cellule. */
    public function removeMember(Request $request, int $id, int $userId): JsonResponse
    {
        $cell = Cell::findOrFail($id);
        Gate::authorize('update', $cell);

        if ($cell->leader_id === $userId) {
            return response()->json([
                'message' => 'Retirez d\'abord ce membre comme leader.',
            ], 422);
        }

        $cell->members()->detach($userId);
        return response()->json(['message' => 'Membre retiré de la cellule.']);
    }

    // === RAPPORTS HEBDOMADAIRES ===

    /** Liste des rapports d'une cellule. */
    public function reports(Request $request, int $id): AnonymousResourceCollection
    {
        $cell = Cell::findOrFail($id);
        Gate::authorize('view', $cell);

        $query = $cell->reports()
            ->with(['leader:id,name,first_name', 'reviewer:id,name,first_name', 'cell:id,name,zone'])
            ->orderByDesc('week_start');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        return AdminCellReportResource::collection($query->paginate($perPage));
    }

    /** Soumission d'un rapport par le leader. */
    public function storeReport(StoreCellReportRequest $request, int $id): JsonResponse
    {
        $cell = Cell::findOrFail($id);
        Gate::authorize('submitReport', $cell);

        $data = $request->validated();
        $weekStart = $data['week_start'];

        // Anti-doublon : (cell_id, week_start) est unique en BDD, on remplace si existe.
        // week_end est calculé automatiquement (lundi → dimanche de la même semaine).
        $weekStartCarbon = \Carbon\Carbon::parse($weekStart)->startOfWeek();
        $weekEnd = $data['week_end'] ?? $weekStartCarbon->copy()->endOfWeek()->toDateString();

        $payload = array_merge($data, [
            'week_end'     => $weekEnd,
            'leader_id'    => $request->user()->id,
            'status'       => $data['status'] ?? 'submitted',
            'submitted_at' => ($data['status'] ?? 'submitted') === 'submitted' ? now() : null,
        ]);

        $report = CellReport::updateOrCreate(
            ['cell_id' => $cell->id, 'week_start' => $weekStart],
            $payload
        );

        return response()->json([
            'message' => 'Rapport enregistré.',
            'data'    => new AdminCellReportResource($report->load(['leader', 'cell'])),
        ], 201);
    }

    /**
     * Revue d'un rapport cellule.
     * Workflow : submitted → reviewed / approved / rejected.
     * Si rejected → review_comment requis.
     */
    public function validateReport(Request $request, int $cellId, int $reportId): JsonResponse
    {
        $cell = Cell::findOrFail($cellId);

        if (! $request->user()->can('validate cell reports')) {
            abort(403);
        }

        $data = Validator::make($request->all(), [
            'status'         => ['required', 'in:reviewed,approved,rejected'],
            'review_comment' => ['nullable', 'string', 'max:2000', 'required_if:status,rejected'],
        ])->validate();

        $report = CellReport::where('cell_id', $cell->id)->findOrFail($reportId);

        if ($report->status === 'draft') {
            return response()->json([
                'message' => 'Un brouillon ne peut pas être revu.',
            ], 422);
        }

        $report->update([
            'status'         => $data['status'],
            'reviewed_by'    => $request->user()->id,
            'reviewed_at'    => now(),
            'review_comment' => $data['review_comment'] ?? null,
        ]);

        // Event → notifie le leader (NotifyLeaderOnCellReportReviewed)
        CellReportReviewed::dispatch($report->fresh());

        return response()->json([
            'message' => 'Rapport revu.',
            'data'    => new AdminCellReportResource($report->fresh(['cell', 'leader', 'reviewer'])),
        ]);
    }

    /** Régénère le PDF + renvoie les emails au pasteur/gouverneur/leader. */
    public function regenerateCellReportPdf(int $cellId, int $reportId): JsonResponse
    {
        $report = CellReport::where('cell_id', $cellId)->findOrFail($reportId);

        if ($report->status === 'draft') {
            return response()->json(['message' => 'Un brouillon n\'a pas de PDF officiel.'], 422);
        }

        GenerateCellReportPdfJob::dispatch($report->id);

        return response()->json([
            'message' => 'Régénération PDF déclenchée. Le fichier sera disponible dans quelques secondes.',
        ]);
    }

    /** Téléchargement PDF côté admin. */
    public function downloadCellReportPdf(int $cellId, int $reportId)
    {
        $report = CellReport::with('cell:id,name')->where('cell_id', $cellId)->findOrFail($reportId);

        if (! $report->pdf_path || ! Storage::disk('local')->exists($report->pdf_path)) {
            return response()->json(['message' => 'PDF non disponible.'], 404);
        }

        $filename = sprintf(
            'Rapport_cellule_%s_%s.pdf',
            Str::slug($report->cell->name ?? 'cellule'),
            $report->week_end?->format('Y-m-d') ?? now()->format('Y-m-d'),
        );

        return Storage::disk('local')->download($report->pdf_path, $filename);
    }
}
