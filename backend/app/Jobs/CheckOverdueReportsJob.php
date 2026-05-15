<?php

namespace App\Jobs;

use App\Models\Department;
use App\Models\DepartmentReport;
use App\Models\Notification as NotificationModel;
use App\Models\User;
use App\Notifications\ReportOverdueNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Job quotidien (8h) : recherche tous les rapports département en retard
 * (status=submitted ET submitted_at > period_end + 7j, OU pas de rapport
 * du tout pour une période passée) puis notifie le gouverneur + pasteur.
 *
 * Anti-spam : un même rapport n'est notifié qu'une fois par jour.
 */
class CheckOverdueReportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1; // un job de check ne se relance pas
    public int $timeout = 300;

    public function handle(): void
    {
        $notifiedCount = 0;

        // === Rapports submitted en retard (period_end + 7j dépassé) ===
        $lateReports = DepartmentReport::with(['department', 'governor'])
            ->whereIn('status', ['submitted'])
            ->where('period_end', '<', now()->subDays(7))
            ->get();

        foreach ($lateReports as $report) {
            if ($this->alreadyNotifiedToday($report->id, 'report_overdue')) continue;
            if ($report->governor) {
                $report->governor->notify(new ReportOverdueNotification($report));
                $notifiedCount++;
            }
        }

        // === Périodes passées SANS rapport du tout ===
        // Pour chaque département actif avec un gouverneur, on regarde s'il manque
        // un rapport mensuel pour le mois précédent.
        $lastMonthEnd = now()->subMonth()->endOfMonth()->toDateString();
        $lastMonthStart = now()->subMonth()->startOfMonth()->toDateString();

        $departments = Department::where('status', 'active')
            ->whereNotNull('governor_id')
            ->get(['id', 'name', 'governor_id']);

        foreach ($departments as $dept) {
            $exists = DepartmentReport::where('department_id', $dept->id)
                ->where('period_start', '>=', $lastMonthStart)
                ->where('period_end', '<=', $lastMonthEnd)
                ->whereIn('status', ['submitted', 'reviewed', 'approved'])
                ->exists();

            if ($exists) continue;

            // Création d'un rapport "fantôme" pour permettre la notif (status=draft
            // sera créé/upsert si pas existant — sinon on notifie le draft existant).
            $report = DepartmentReport::firstOrCreate(
                [
                    'department_id' => $dept->id,
                    'period_start'  => $lastMonthStart,
                    'period_end'    => $lastMonthEnd,
                    'report_type'   => 'monthly_activity',
                ],
                [
                    'governor_id' => $dept->governor_id,
                    'status'      => 'draft',
                ]
            );

            if ($this->alreadyNotifiedToday($report->id, 'report_overdue')) continue;

            $governor = User::find($dept->governor_id);
            if ($governor) {
                $governor->notify(new ReportOverdueNotification($report));
                $notifiedCount++;
            }
        }

        Log::info('CheckOverdueReportsJob: terminé', [
            'late_reports_count' => $lateReports->count(),
            'notifications_sent' => $notifiedCount,
        ]);
    }

    /** Évite d'envoyer plusieurs notifs identiques le même jour. */
    protected function alreadyNotifiedToday(int $reportId, string $typePrefix): bool
    {
        $today = now()->startOfDay();
        return DB::table('notifications')
            ->where('type', 'like', "%{$typePrefix}%")
            ->where('data', 'like', '%"report_id":'.$reportId.'%')
            ->where('created_at', '>=', $today)
            ->exists();
    }
}
