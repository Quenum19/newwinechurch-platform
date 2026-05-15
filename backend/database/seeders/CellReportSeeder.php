<?php

namespace Database\Seeders;

use App\Models\Cell;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — 8 semaines de rapports hebdo par cellule.
 *
 * Statuts variés pour exercer le workflow :
 *  - semaines 1-5 (anciennes) : reviewed
 *  - semaines 6-7 : submitted
 *  - semaine 8 (la plus récente) : draft ou submitted (50/50)
 */
class CellReportSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $count = 0;

        $cells = Cell::whereNotNull('leader_id')->where('is_active', true)->get();

        foreach ($cells as $cell) {
            $members = $cell->members()->count() ?: 8;

            for ($i = 8; $i >= 1; $i--) {
                $weekStart = $now->copy()->subWeeks($i)->startOfWeek(); // lundi
                $weekEnd   = $weekStart->copy()->endOfWeek();           // dimanche

                $status = match (true) {
                    $i >= 4 => 'reviewed',
                    $i >= 2 => 'submitted',
                    default => rand(0,1) ? 'submitted' : 'draft',
                };

                $submittedAt = $status === 'draft'
                    ? null
                    : $weekEnd->copy()->addDays(rand(0, 5));

                $reviewedAt = $status === 'reviewed'
                    ? $submittedAt?->copy()->addDays(rand(1, 4))
                    : null;

                $attendance = max(2, (int) round($members * (rand(70, 95) / 100)));
                $newMembers = rand(0, 1) ? rand(0, 3) : 0;

                DB::table('cell_reports')->insert([
                    'cell_id'           => $cell->id,
                    'leader_id'         => $cell->leader_id,
                    'week_start'        => $weekStart->toDateString(),
                    'week_end'          => $weekEnd->toDateString(),
                    'attendance_count'  => $attendance,
                    'new_members'       => $newMembers,
                    'prayer_requests'   => json_encode([
                        ['title' => 'Santé d\'un membre', 'requester' => 'Famille X',   'urgency' => 'high'],
                        ['title' => 'Travail',           'requester' => 'Anonyme',     'urgency' => 'medium'],
                    ]),
                    'activities'        => json_encode([
                        ['type' => 'evangelism', 'description' => 'Sortie porte-à-porte', 'date' => $weekStart->toDateString(), 'count' => rand(5, 20)],
                        ['type' => 'teaching',   'description' => 'Étude biblique sur la prière', 'date' => $weekStart->copy()->addDays(3)->toDateString(), 'count' => $attendance],
                    ]),
                    'challenges'        => 'Quelques absences récurrentes à suivre.',
                    'highlights'        => 'Témoignage fort d\'un membre récemment converti.',
                    'needs_followup'    => rand(0, 4) === 0, // 20% des rapports nécessitent suivi
                    'status'            => $status,
                    'submitted_at'      => $submittedAt,
                    'reviewed_by'       => null,
                    'reviewed_at'       => $reviewedAt,
                    'review_comment'    => $status === 'reviewed' ? 'OK validé.' : null,
                    'created_at'        => $submittedAt ?? $weekEnd,
                    'updated_at'        => $reviewedAt ?? $submittedAt ?? $weekEnd,
                ]);
                $count++;
            }
        }

        $this->command->info("  ✓ {$count} rapports cellule seedés (8 semaines × {$cells->count()} cellules)");
    }
}
