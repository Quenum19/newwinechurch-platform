<?php

namespace Database\Seeders;

use App\Models\Cell;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — Présences réalistes sur 8 semaines pour chaque cellule.
 *
 * Taux global ~70-90% : la majorité présents, quelques absences récurrentes.
 * 10% arrivent en retard. Un membre n'est saisi qu'une fois par (cell, date).
 *
 * Volumétrie : ~8 cellules × ~8 membres × 8 semaines = ~500 lignes.
 * Bulk insert par lots de 200 pour limiter les allers-retours DB.
 */
class CellAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $rows = [];
        $totalInserted = 0;

        $cells = Cell::with('members')->whereNotNull('leader_id')->get();

        foreach ($cells as $cell) {
            $members = $cell->members; // chargé en eager loading
            if ($members->isEmpty()) continue;

            for ($i = 8; $i >= 1; $i--) {
                // On simule la réunion à la date 'meeting_day' de la semaine i.
                $meetingDate = $now->copy()->subWeeks($i)->startOfWeek()->addDays(rand(0, 6));

                foreach ($members as $member) {
                    $isPresent = rand(1, 100) <= 85; // 85% présent en moyenne
                    $arrivedLate = $isPresent && rand(1, 100) <= 12;

                    $rows[] = [
                        'cell_id'      => $cell->id,
                        'member_id'    => $member->id,
                        'meeting_date' => $meetingDate->toDateString(),
                        'is_present'   => $isPresent,
                        'arrived_late' => $arrivedLate,
                        'note'         => null,
                        'recorded_by'  => $cell->leader_id,
                        'created_at'   => $meetingDate,
                        'updated_at'   => $meetingDate,
                    ];

                    // Flush par lots pour la perf.
                    if (count($rows) >= 200) {
                        DB::table('cell_attendance')->insertOrIgnore($rows);
                        $totalInserted += count($rows);
                        $rows = [];
                    }
                }
            }
        }

        if (! empty($rows)) {
            DB::table('cell_attendance')->insertOrIgnore($rows);
            $totalInserted += count($rows);
        }

        $this->command->info("  ✓ {$totalInserted} présences cellule seedées (8 sem × {$cells->count()} cellules)");
    }
}
