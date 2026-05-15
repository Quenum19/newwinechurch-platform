<?php

namespace App\Jobs;

use App\Models\DepartmentReport;
use App\Models\DepartmentReportTemplate;
use App\Models\User;
use App\Mail\DepartmentReportSubmittedWithPdfMail;
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
 * Job — génère le PDF officiel d'un rapport département soumis,
 * le stocke sur disk 'local' (storage/app/reports/) puis envoie 3 emails
 * avec le PDF en pièce jointe :
 *
 *   1. au gouverneur soumissionnaire (accusé de réception)
 *   2. à chaque pasteur actif
 *   3. à chaque utilisateur RH actif
 *
 * Pourquoi un Job dédié plutôt que dans le listener existant ?
 *  - Rendu PDF = lourd (DomPDF) → on isole sur queue séparée.
 *  - On peut retenter en cas d'échec sans renvoyer toutes les notifications database/broadcast.
 *  - L'event DepartmentReportSubmitted continue d'alimenter les notifications
 *    in-app (inbox) et broadcast (Reverb) via NotifyPastorAndHR — ce job
 *    ne fait QUE le PDF + emails-avec-pièce-jointe.
 */
class GenerateDepartmentReportPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30; // secondes entre retries

    public function __construct(public int $reportId) {}

    public function handle(): void
    {
        $report = DepartmentReport::with(['department', 'governor'])->find($this->reportId);

        if (! $report) {
            Log::warning("GenerateDepartmentReportPdfJob: rapport #{$this->reportId} introuvable.");
            return;
        }

        // Template du département (peut être null si suppression entre submit et job).
        $template = DepartmentReportTemplate::active()
            ->where('department_id', $report->department_id)
            ->orderByDesc('version')
            ->first();

        // 1) Rendu PDF
        $pdf = Pdf::loadView('pdf.department_report', [
            'report'     => $report,
            'department' => $report->department,
            'governor'   => $report->governor,
            'template'   => $template,
            'schema'     => $template?->schema ?? [],
            'formData'   => $report->form_data ?? [],
            'submittedAt'=> $report->submitted_at,
        ])->setPaper('a4', 'portrait');

        // 2) Stockage
        $filename = sprintf(
            'reports/%d/dept-%d_report-%d_%s.pdf',
            $report->department_id,
            $report->department_id,
            $report->id,
            Str::slug($report->period_end?->format('Y-m-d') ?? now()->format('Y-m-d')),
        );

        Storage::disk('local')->put($filename, $pdf->output());

        $report->update([
            'pdf_path'         => $filename,
            'pdf_generated_at' => now(),
        ]);

        // 3) Récupère les destinataires emails (pasteur + RH + le gouverneur)
        $pasteurs = User::role(['pasteur'])->where('status', 'active')->get();
        $rhs      = User::role(['rh'])->where('status', 'active')->get();
        $governor = $report->governor;

        $absolutePdfPath = Storage::disk('local')->path($filename);
        $downloadName    = sprintf(
            'Rapport_%s_%s.pdf',
            Str::slug($report->department->name),
            $report->period_end?->format('Y-m-d') ?? now()->format('Y-m-d'),
        );

        // Pasteurs (rôle principal)
        foreach ($pasteurs as $pasteur) {
            Mail::to($pasteur->email)->queue(
                new DepartmentReportSubmittedWithPdfMail(
                    report:        $report,
                    recipient:     $pasteur,
                    audience:      'pasteur',
                    pdfPath:       $absolutePdfPath,
                    downloadName:  $downloadName,
                )
            );
        }

        // RH
        foreach ($rhs as $rh) {
            Mail::to($rh->email)->queue(
                new DepartmentReportSubmittedWithPdfMail(
                    report:        $report,
                    recipient:     $rh,
                    audience:      'rh',
                    pdfPath:       $absolutePdfPath,
                    downloadName:  $downloadName,
                )
            );
        }

        // Gouverneur (accusé)
        if ($governor && $governor->email) {
            Mail::to($governor->email)->queue(
                new DepartmentReportSubmittedWithPdfMail(
                    report:        $report,
                    recipient:     $governor,
                    audience:      'governor',
                    pdfPath:       $absolutePdfPath,
                    downloadName:  $downloadName,
                )
            );
        }

        Log::info("PDF rapport #{$report->id} généré + emails dispatchés (pasteur×{$pasteurs->count()}, rh×{$rhs->count()}, governor×1).");
    }

    /** Echec définitif (après tries) — on log proprement. */
    public function failed(\Throwable $e): void
    {
        Log::error("GenerateDepartmentReportPdfJob #{$this->reportId} échec définitif : {$e->getMessage()}");
    }
}
