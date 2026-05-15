<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Events\DepartmentReportSubmitted;
use App\Http\Requests\Governor\StoreGovernorReportRequest;
use App\Http\Requests\Governor\UpdateGovernorReportRequest;
use App\Http\Resources\Governor\DepartmentReportResource;
use App\Jobs\GenerateDepartmentReportPdfJob;
use App\Models\DepartmentReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Rapports de département pour le gouverneur courant.
 *
 *  - index : cursorPaginate(15) avec filtres status / period.
 *  - store : status=draft, governor_id=auth().
 *  - update : si status=draft uniquement (policy).
 *  - submit : draft → submitted + dispatch SendReportSubmittedNotificationsJob.
 *  - destroy : soft delete uniquement si draft.
 */
class GovernorReportsController extends Controller
{
    public function index(Request $request)
    {
        $deptId = (int) $request->governor_department_id;

        $query = DepartmentReport::where('department_id', $deptId)
            ->with(['reviewer:id,name,first_name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($from = $request->query('period_from')) {
            $query->where('period_start', '>=', $from);
        }
        if ($to = $request->query('period_to')) {
            $query->where('period_end', '<=', $to);
        }

        $query->orderByDesc('period_end');

        $perPage = min((int) $request->query('per_page', 15), 50);
        return DepartmentReportResource::collection($query->cursorPaginate($perPage));
    }

    public function show(Request $request, int $id)
    {
        $report = DepartmentReport::with(['department:id,name,slug', 'governor:id,name,first_name,avatar', 'reviewer:id,name,first_name'])
            ->findOrFail($id);

        // Scope : doit être du département du gouverneur courant.
        if ($report->department_id !== (int) $request->governor_department_id) {
            abort(403, 'Rapport hors de votre département.');
        }
        Gate::authorize('view', $report);

        return new DepartmentReportResource($report);
    }

    public function store(StoreGovernorReportRequest $request)
    {
        Gate::authorize('create', DepartmentReport::class);
        $deptId = (int) $request->governor_department_id;

        $report = DB::transaction(function () use ($deptId, $request) {
            return DepartmentReport::create(array_merge($request->validated(), [
                'department_id' => $deptId,
                'governor_id'   => $request->user()->id,
                'status'        => 'draft',
            ]));
        });

        activity('reports')
            ->causedBy($request->user())
            ->performedOn($report)
            ->log('Rapport département créé (draft)');

        return new DepartmentReportResource($report);
    }

    public function update(UpdateGovernorReportRequest $request, int $id)
    {
        $report = DepartmentReport::findOrFail($id);
        Gate::authorize('update', $report);

        // Scope : appartient au département du gouverneur courant.
        if ($report->department_id !== (int) $request->governor_department_id) {
            abort(403, 'Rapport hors de votre département.');
        }

        $report->fill($request->validated())->save();

        return new DepartmentReportResource($report->fresh(['reviewer']));
    }

    /** draft → submitted + queue notification. */
    public function submit(Request $request, int $id): JsonResponse
    {
        $report = DepartmentReport::findOrFail($id);
        Gate::authorize('submit', $report);

        if ($report->department_id !== (int) $request->governor_department_id) {
            abort(403, 'Rapport hors de votre département.');
        }

        DB::transaction(function () use ($report) {
            $report->update([
                'status'       => 'submitted',
                'submitted_at' => now(),
            ]);
        });

        // Fire l'event : LogReportActivity + NotifyPastorAndHR (inbox + broadcast) s'abonnent.
        DepartmentReportSubmitted::dispatch($report->fresh());

        // PDF généré SYNC pour qu'il soit dispo immédiatement à la réponse HTTP.
        // Les emails (Mail::to->queue dans le job) restent async via QUEUE_CONNECTION.
        GenerateDepartmentReportPdfJob::dispatchSync($report->id);

        Cache::forget(GovernorDashboardController::cacheKey($report->department_id));

        return response()->json([
            'message' => 'Rapport soumis. PDF et notifications en cours d\'envoi.',
            'data'    => new DepartmentReportResource($report->fresh()),
        ]);
    }

    /** Téléchargement du PDF officiel du rapport (gouverneur). */
    public function downloadPdf(Request $request, int $id)
    {
        $report = DepartmentReport::with('department:id,name,slug')->findOrFail($id);

        // Même département.
        if ($report->department_id !== (int) $request->governor_department_id) {
            abort(403, 'Rapport hors de votre département.');
        }
        Gate::authorize('view', $report);

        if (! $report->pdf_path || ! Storage::disk('local')->exists($report->pdf_path)) {
            return response()->json(['message' => 'PDF non encore disponible. Réessayez dans quelques instants.'], 404);
        }

        $filename = sprintf(
            'Rapport_%s_%s.pdf',
            Str::slug($report->department->name ?? 'departement'),
            $report->period_end?->format('Y-m-d') ?? now()->format('Y-m-d'),
        );

        return Storage::disk('local')->download($report->pdf_path, $filename);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $report = DepartmentReport::findOrFail($id);

        if ($report->department_id !== (int) $request->governor_department_id) {
            abort(403, 'Rapport hors de votre département.');
        }
        if ($report->status !== 'draft') {
            return response()->json([
                'message' => 'Seuls les brouillons peuvent être supprimés.',
            ], 422);
        }
        if ($report->governor_id !== $request->user()->id) {
            abort(403);
        }

        $report->delete(); // soft delete

        return response()->json(['message' => 'Brouillon supprimé.']);
    }
}
