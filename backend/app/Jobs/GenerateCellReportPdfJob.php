<?php

namespace App\Jobs;

use App\Mail\CellReportSubmittedWithPdfMail;
use App\Models\CellReport;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Job — génère le PDF officiel d'un rapport cellule soumis,
 * le stocke sur disk 'local' (storage/app/reports/cells/) puis envoie 3 emails
 * avec PJ :
 *   1. Au leader soumissionnaire (accusé)
 *   2. Au gouverneur du département du leader
 *   3. À chaque pasteur actif
 *
 * Pourquoi pas de RH ? Les rapports cellule sont plus opérationnels — RH n'est
 * pas dans la chaîne de validation (contrairement aux rapports département).
 */
class GenerateCellReportPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public int $reportId) {}

    public function handle(): void
    {
        $report = CellReport::with(['cell.leader', 'leader'])->find($this->reportId);

        if (! $report) {
            Log::warning("GenerateCellReportPdfJob: rapport cellule #{$this->reportId} introuvable.");
            return;
        }

        // 1) Rendu PDF
        $pdf = Pdf::loadView('pdf.cell_report', [
            'report'          => $report,
            'cell'            => $report->cell,
            'leader'          => $report->leader,
            'attendanceRate'  => $report->attendanceRate(),
        ])->setPaper('a4', 'portrait');

        // 2) Stockage
        $filename = sprintf(
            'reports/cells/%d/cell-%d_report-%d_%s.pdf',
            $report->cell_id,
            $report->cell_id,
            $report->id,
            Str::slug($report->week_end?->format('Y-m-d') ?? now()->format('Y-m-d')),
        );

        Storage::disk('local')->put($filename, $pdf->output());

        $report->update([
            'pdf_path'         => $filename,
            'pdf_generated_at' => now(),
        ]);

        // 3) Récipients
        $leader    = $report->leader;
        $deptId    = $report->cell?->leader?->department_id;
        $governors = $deptId
            ? User::role('gouverneur')->where('department_id', $deptId)->where('status', 'active')->get()
            : collect();
        $pasteurs  = User::role('pasteur')->where('status', 'active')->get();

        $absolutePdfPath = Storage::disk('local')->path($filename);
        $downloadName    = sprintf(
            'Rapport_cellule_%s_%s.pdf',
            Str::slug($report->cell?->name ?? 'cellule'),
            $report->week_end?->format('Y-m-d') ?? now()->format('Y-m-d'),
        );

        foreach ($pasteurs as $pasteur) {
            Mail::to($pasteur->email)->queue(
                new CellReportSubmittedWithPdfMail($report, $pasteur, 'pasteur', $absolutePdfPath, $downloadName)
            );
        }
        foreach ($governors as $gov) {
            Mail::to($gov->email)->queue(
                new CellReportSubmittedWithPdfMail($report, $gov, 'governor', $absolutePdfPath, $downloadName)
            );
        }
        if ($leader && $leader->email) {
            Mail::to($leader->email)->queue(
                new CellReportSubmittedWithPdfMail($report, $leader, 'leader', $absolutePdfPath, $downloadName)
            );
        }

        Log::info("PDF cellule #{$report->id} généré + emails dispatchés (pasteur×{$pasteurs->count()}, gov×{$governors->count()}, leader×1).");
    }

    public function failed(\Throwable $e): void
    {
        Log::error("GenerateCellReportPdfJob #{$this->reportId} échec définitif : {$e->getMessage()}");
    }
}
