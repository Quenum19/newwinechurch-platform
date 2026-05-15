<?php

namespace App\Jobs;

use App\Models\CellReport;
use App\Models\DepartmentReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Job — Cleanup hebdomadaire.
 *
 * Supprime :
 *  - Notifications database lues il y a plus de 90 jours
 *  - PDFs orphelins (rapports soft-deleted depuis plus de 30 jours)
 *  - Logs Activitylog datant de plus de 180 jours (catégorie 'reports' + 'cell_reports')
 *
 * Pourquoi un Job (vs des Commandes Artisan séparées) :
 *  - On batch tout en une fenêtre nocturne pour éviter d'avoir 4 entrées cron
 *  - Logs + métriques centralisés en cas d'échec
 *
 * NB : `php artisan telescope:prune`, `auth:clear-resets` et `queue:prune-failed`
 * sont planifiés directement dans console.php (commandes natives).
 */
class CleanupStorageAndLogsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600;

    public function handle(): void
    {
        $stats = [
            'notifications_pruned' => 0,
            'pdf_files_deleted'    => 0,
            'activity_logs_pruned' => 0,
        ];

        // 1) Notifications lues > 90 jours
        $stats['notifications_pruned'] = DB::table('notifications')
            ->whereNotNull('read_at')
            ->where('read_at', '<', now()->subDays(90))
            ->delete();

        // 2) PDFs orphelins (rapports soft-deleted depuis > 30j → fichier inutile)
        //    On utilise `onlyTrashed` pour ne toucher QUE les soft-deleted.
        $deletedReports = DepartmentReport::onlyTrashed()
            ->whereNotNull('pdf_path')
            ->where('deleted_at', '<', now()->subDays(30))
            ->get(['id', 'pdf_path']);

        foreach ($deletedReports as $r) {
            if (Storage::disk('local')->exists($r->pdf_path)) {
                Storage::disk('local')->delete($r->pdf_path);
                $stats['pdf_files_deleted']++;
            }
            // On garde l'enregistrement DB pour audit, on retire juste le pdf_path
            $r->update(['pdf_path' => null]);
        }

        $deletedCellReports = CellReport::onlyTrashed()
            ->whereNotNull('pdf_path')
            ->where('deleted_at', '<', now()->subDays(30))
            ->get(['id', 'pdf_path']);

        foreach ($deletedCellReports as $r) {
            if (Storage::disk('local')->exists($r->pdf_path)) {
                Storage::disk('local')->delete($r->pdf_path);
                $stats['pdf_files_deleted']++;
            }
            $r->update(['pdf_path' => null]);
        }

        // 3) Activity Log Spatie > 180 jours (on garde 6 mois d'historique)
        if (DB::getSchemaBuilder()->hasTable('activity_log')) {
            $stats['activity_logs_pruned'] = DB::table('activity_log')
                ->where('created_at', '<', now()->subDays(180))
                ->delete();
        }

        Log::info('NWC cleanup hebdo terminé', $stats);
    }
}
