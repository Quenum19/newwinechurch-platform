<?php

namespace App\Jobs;

use App\Models\Cell;
use App\Models\CellReport;
use App\Notifications\CellMissingReportNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job hebdomadaire (lundi 9h) : pour chaque cellule active, vérifie qu'un
 * rapport a été soumis pour la semaine précédente. Sinon → notification au
 * leader (rappel doux). Si manquant depuis ≥2 semaines → urgent + notif
 * gouverneur via le canal Notification.
 */
class CheckMissingCellReportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600;

    public function handle(): void
    {
        $notifiedLeaders = 0;
        $cells = Cell::with('leader')
            ->where('is_active', true)
            ->whereNotNull('leader_id')
            ->cursor();

        foreach ($cells as $cell) {
            // Liste des week_start (lundi) attendus sur les 4 dernières semaines
            // (au-delà de 4 semaines on ne harcèle plus — le digest s'en charge).
            $expectedWeeks = [];
            for ($i = 1; $i <= 4; $i++) {
                $expectedWeeks[] = now()->subWeeks($i)->startOfWeek()->toDateString();
            }

            $submittedWeeks = CellReport::where('cell_id', $cell->id)
                ->whereIn('week_start', $expectedWeeks)
                ->where('status', '!=', 'draft')
                ->pluck('week_start')
                ->map(fn ($d) => \Carbon\Carbon::parse($d)->toDateString())
                ->all();

            $missingWeeks = array_values(array_diff($expectedWeeks, $submittedWeeks));
            if (empty($missingWeeks)) continue;

            // On notifie le leader avec le compte de semaines manquantes.
            $cell->leader->notify(new CellMissingReportNotification(
                cell:              $cell,
                weeksMissing:      count($missingWeeks),
                missingWeekStarts: $missingWeeks,
            ));
            $notifiedLeaders++;
        }

        Log::info('CheckMissingCellReportsJob: terminé', [
            'leaders_notified' => $notifiedLeaders,
        ]);
    }
}
