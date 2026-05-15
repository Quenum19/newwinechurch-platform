<?php

namespace App\Http\Controllers\Leader;

use App\Http\Controllers\Controller;
use App\Events\CellReportSubmitted;
use App\Http\Requests\Leader\StoreCellReportRequest;
use App\Http\Requests\Leader\UpdateCellReportRequest;
use App\Http\Resources\Leader\CellReportResource;
use App\Jobs\GenerateCellReportPdfJob;
use App\Models\CellReport;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Rapports de cellule pour le leader courant.
 */
class LeaderReportController extends Controller
{
    public function index(Request $request)
    {
        $cellId = (int) $request->leader_cell_id;

        $query = CellReport::where('cell_id', $cellId)
            ->with('reviewer:id,name,first_name')
            ->orderByDesc('week_start');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->query('per_page', 15), 50);
        return CellReportResource::collection($query->cursorPaginate($perPage));
    }

    public function show(Request $request, int $id)
    {
        $report = CellReport::with(['cell:id,name,zone', 'leader:id,name,first_name,avatar', 'reviewer:id,name,first_name'])
            ->findOrFail($id);

        if ($report->cell_id !== (int) $request->leader_cell_id) {
            abort(403, 'Rapport hors de votre cellule.');
        }
        Gate::authorize('view', $report);

        return new CellReportResource($report);
    }

    public function store(StoreCellReportRequest $request)
    {
        Gate::authorize('create', CellReport::class);
        $cellId = (int) $request->leader_cell_id;

        $data = $request->validated();
        // Normaliser week_start au lundi de la semaine, et déduire week_end.
        $weekStart = Carbon::parse($data['week_start'])->startOfWeek();
        $weekEnd   = $weekStart->copy()->endOfWeek();

        $report = DB::transaction(function () use ($cellId, $data, $weekStart, $weekEnd, $request) {
            // Anti-doublon : (cell_id, week_start) est unique en BDD.
            return CellReport::updateOrCreate(
                ['cell_id' => $cellId, 'week_start' => $weekStart->toDateString()],
                array_merge($data, [
                    'week_start' => $weekStart->toDateString(),
                    'week_end'   => $weekEnd->toDateString(),
                    'leader_id'  => $request->user()->id,
                    'status'     => 'draft',
                ])
            );
        });

        activity('cell_reports')
            ->causedBy($request->user())
            ->performedOn($report)
            ->log('Rapport cellule créé (draft)');

        return new CellReportResource($report);
    }

    public function update(UpdateCellReportRequest $request, int $id)
    {
        $report = CellReport::findOrFail($id);
        Gate::authorize('update', $report);

        if ($report->cell_id !== (int) $request->leader_cell_id) {
            abort(403);
        }

        $report->fill($request->validated())->save();

        return new CellReportResource($report->fresh(['reviewer']));
    }

    /** draft → submitted + notification temps réel. */
    public function submit(Request $request, int $id): JsonResponse
    {
        $report = CellReport::with('cell.leader')->findOrFail($id);
        Gate::authorize('submit', $report);

        if ($report->cell_id !== (int) $request->leader_cell_id) {
            abort(403);
        }

        DB::transaction(function () use ($report) {
            $report->update([
                'status'       => 'submitted',
                'submitted_at' => now(),
            ]);
        });

        // Fire l'event : LogReportActivity + NotifyGovernorOnCellReport (inbox + broadcast) s'abonnent.
        CellReportSubmitted::dispatch($report->fresh());

        // PDF généré SYNC (dispo dans la réponse) ; emails queue async.
        GenerateCellReportPdfJob::dispatchSync($report->id);

        // Invalide cache dashboard leader + gouverneur du leader.
        Cache::forget(LeaderDashboardController::cacheKey($report->cell_id));
        $leaderDeptId = $report->cell?->leader?->department_id;
        if ($leaderDeptId) {
            Cache::forget(\App\Http\Controllers\Governor\GovernorDashboardController::cacheKey($leaderDeptId));
        }

        return response()->json([
            'message' => 'Rapport soumis. PDF et notifications en cours d\'envoi.',
            'data'    => new CellReportResource($report->fresh()),
        ]);
    }

    /** Téléchargement du PDF officiel du rapport cellule (leader). */
    public function downloadPdf(Request $request, int $id)
    {
        $report = CellReport::with('cell:id,name')->findOrFail($id);

        if ($report->cell_id !== (int) $request->leader_cell_id) {
            abort(403, 'Rapport hors de votre cellule.');
        }
        Gate::authorize('view', $report);

        if (! $report->pdf_path || ! Storage::disk('local')->exists($report->pdf_path)) {
            return response()->json(['message' => 'PDF non encore disponible. Réessayez dans quelques instants.'], 404);
        }

        $filename = sprintf(
            'Rapport_cellule_%s_%s.pdf',
            Str::slug($report->cell->name ?? 'cellule'),
            $report->week_end?->format('Y-m-d') ?? now()->format('Y-m-d'),
        );

        return Storage::disk('local')->download($report->pdf_path, $filename);
    }
}
