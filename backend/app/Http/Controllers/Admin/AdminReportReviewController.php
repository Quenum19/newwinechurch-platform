<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReviewDepartmentReportRequest;
use App\Events\DepartmentReportReviewed;
use App\Http\Resources\Governor\DepartmentReportResource;
use App\Http\Resources\Leader\CellReportResource;
use App\Jobs\GenerateDepartmentReportPdfJob;
use App\Models\CellReport;
use App\Models\Department;
use App\Models\DepartmentReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Admin / Pasteur — review des rapports département & cellule.
 *
 * Workflow possible :
 *   submitted → reviewed
 *   submitted → approved
 *   submitted → rejected (review_comment requis)
 *
 * Notifie le gouverneur / leader concerné via job en queue.
 */
class AdminReportReviewController extends Controller
{
    /**
     * Liste GLOBALE des rapports département (pasteur/admin/RH).
     * Filtres : status, department_id, period_from/to, search (gouverneur name).
     */
    public function allDepartmentReports(Request $request)
    {
        // ORDER BY id DESC plutôt que submitted_at :
        //   - submitted_at est NULL pour les drafts, ce qui empêchait cursorPaginate
        //     de générer un cursor stable et faisait DISPARAÎTRE les brouillons
        //     de la liste admin (cf. bug remonté 2026-05-15).
        //   - id est garanti non-null et monotone : ordre chronologique de création
        //     fiable + cursor stable. Les rapports les plus récents (toute statut
        //     confondu) remontent en haut, ce qui correspond au besoin admin.
        $query = DepartmentReport::query()
            ->with([
                'department:id,name,slug',
                'governor:id,name,first_name,avatar',
                'reviewer:id,name,first_name',
            ])
            ->orderByDesc('id');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($deptId = $request->query('department_id')) {
            $query->where('department_id', $deptId);
        }
        if ($from = $request->query('period_from')) {
            $query->where('period_start', '>=', $from);
        }
        if ($to = $request->query('period_to')) {
            $query->where('period_end', '<=', $to);
        }
        if ($search = $request->query('search')) {
            $query->whereHas('governor', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        return DepartmentReportResource::collection($query->cursorPaginate($perPage));
    }

    /** Détail d'un rapport (admin/pasteur/RH). */
    public function showReport(int $id): JsonResponse
    {
        $report = DepartmentReport::with([
            'department:id,name,slug',
            'governor:id,name,first_name,avatar',
            'reviewer:id,name,first_name',
        ])->findOrFail($id);

        return response()->json([
            'data' => new DepartmentReportResource($report),
        ]);
    }

    /**
     * Re-dispatche la génération du PDF + envoi des emails.
     * Utile si la queue avait échoué ou si on a régénéré le template.
     */
    public function regeneratePdf(int $id): JsonResponse
    {
        $report = DepartmentReport::findOrFail($id);

        if ($report->status === 'draft') {
            return response()->json([
                'message' => 'Un brouillon n\'a pas de PDF officiel.',
            ], 422);
        }

        GenerateDepartmentReportPdfJob::dispatch($report->id);

        return response()->json([
            'message' => 'Régénération PDF déclenchée. Le fichier sera disponible dans quelques secondes.',
        ]);
    }

    /** Téléchargement du PDF officiel d'un rapport (admin/pasteur/RH). */
    public function downloadReportPdf(int $id)
    {
        $report = DepartmentReport::with('department:id,name,slug')->findOrFail($id);

        if (! $report->pdf_path || ! Storage::disk('local')->exists($report->pdf_path)) {
            return response()->json(['message' => 'PDF non disponible.'], 404);
        }

        $filename = sprintf(
            'Rapport_%s_%s.pdf',
            Str::slug($report->department->name ?? 'departement'),
            $report->period_end?->format('Y-m-d') ?? now()->format('Y-m-d'),
        );

        return Storage::disk('local')->download($report->pdf_path, $filename);
    }

    /** Liste des rapports d'un département (vue admin/pasteur). */
    public function departmentReports(Request $request, int $departmentId)
    {
        $dept = Department::findOrFail($departmentId);
        \Illuminate\Support\Facades\Gate::authorize('view', $dept);

        $query = DepartmentReport::where('department_id', $dept->id)
            ->with([
                'governor:id,name,first_name,avatar',
                'reviewer:id,name,first_name',
            ])
            ->orderByDesc('period_end');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->query('per_page', 15), 50);
        return DepartmentReportResource::collection($query->cursorPaginate($perPage));
    }

    /** Liste des rapports d'une cellule (vue admin/pasteur). */
    public function cellReports(Request $request, int $cellId)
    {
        $query = CellReport::where('cell_id', $cellId)
            ->with(['leader:id,name,first_name,avatar', 'reviewer:id,name,first_name'])
            ->orderByDesc('week_start');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->query('per_page', 15), 50);
        return CellReportResource::collection($query->cursorPaginate($perPage));
    }

    /** Valider/rejeter un rapport département. */
    public function reviewDepartmentReport(ReviewDepartmentReportRequest $request, int $reportId): JsonResponse
    {
        $report = DepartmentReport::findOrFail($reportId);

        if ($report->status === 'draft') {
            return response()->json([
                'message' => 'Un brouillon ne peut pas être revu.',
            ], 422);
        }

        DB::transaction(function () use ($report, $request) {
            $report->update([
                'status'         => $request->validated('status'),
                'reviewed_by'    => $request->user()->id,
                'reviewed_at'    => now(),
                'review_comment' => $request->validated('review_comment'),
            ]);
        });

        // Fire l'event : LogReportActivity + NotifyGovernorOnReportReviewed s'abonnent.
        DepartmentReportReviewed::dispatch($report->fresh());

        Cache::forget(\App\Http\Controllers\Governor\GovernorDashboardController::cacheKey($report->department_id));

        return response()->json([
            'message' => 'Rapport revu.',
            'data'    => new DepartmentReportResource($report->fresh(['reviewer', 'governor', 'department'])),
        ]);
    }

    /** Analytics globales tous départements (pasteur/admin). */
    public function departmentsAnalytics(Request $request): JsonResponse
    {
        $payload = Cache::remember(
            'admin:analytics:departments',
            now()->addMinutes(5),
            function () {
                $totalDepts     = Department::where('status', 'active')->count();
                $totalMembers   = DB::table('department_user')->distinct('user_id')->count('user_id');
                $reportsPending = DepartmentReport::where('status', 'submitted')->count();
                $reportsLate    = DepartmentReport::whereIn('status', ['draft', 'submitted'])
                    ->where('period_end', '<', now()->subDays(7))
                    ->count();

                // Top 5 départements les plus dynamiques (rapports soumis 3 mois).
                $topDepts = DepartmentReport::where('submitted_at', '>=', now()->subMonths(3))
                    ->whereIn('status', ['submitted', 'reviewed', 'approved'])
                    ->select('department_id', DB::raw('COUNT(*) as reports_count'))
                    ->groupBy('department_id')
                    ->orderByDesc('reports_count')
                    ->limit(5)
                    ->with('department:id,name,slug')
                    ->get();

                return [
                    'kpis' => [
                        'departments_active'     => $totalDepts,
                        'total_members'          => $totalMembers,
                        'reports_pending_count'  => $reportsPending,
                        'reports_late_count'     => $reportsLate,
                    ],
                    'top_departments' => $topDepts->map(fn ($r) => [
                        'department_id'   => $r->department_id,
                        'department_name' => $r->department?->name,
                        'reports_count'   => $r->reports_count,
                    ]),
                    'generated_at' => now()->toIso8601String(),
                ];
            }
        );

        return response()->json($payload);
    }
}
