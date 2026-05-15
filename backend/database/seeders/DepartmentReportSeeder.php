<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — 3 rapports par département actif sur les 3 derniers mois.
 *
 * Statuts répartis pour exercer le workflow :
 *  - rapport M-2 → approved (clôturé)
 *  - rapport M-1 → reviewed
 *  - rapport mois courant → submitted ou draft (aléatoire)
 *
 * form_data simule un template "monthly_activity" avec quelques sections.
 */
class DepartmentReportSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $count = 0;

        $departments = Department::whereNotNull('governor_id')
                                 ->where('status', 'active')
                                 ->get();

        if ($departments->isEmpty()) {
            $this->command->warn('  ⚠ Aucun département avec gouverneur — DepartmentReportSeeder ignoré.');
            return;
        }

        $statuses = [
            ['offset' => 2, 'status' => 'approved'],
            ['offset' => 1, 'status' => 'reviewed'],
            ['offset' => 0, 'status' => rand(0,1) ? 'submitted' : 'draft'],
        ];

        foreach ($departments as $dept) {
            foreach ($statuses as $cfg) {
                $monthRef = $now->copy()->subMonths($cfg['offset'])->startOfMonth();
                $start = $monthRef->copy();
                $end   = $monthRef->copy()->endOfMonth();

                $submittedAt = $cfg['status'] === 'draft'
                    ? null
                    : $end->copy()->addDays(rand(1, 5));

                $reviewedAt = in_array($cfg['status'], ['reviewed', 'approved'])
                    ? $submittedAt?->copy()->addDays(rand(1, 7))
                    : null;

                DB::table('department_reports')->insert([
                    'department_id'  => $dept->id,
                    'governor_id'    => $dept->governor_id,
                    'report_type'    => 'monthly_activity',
                    'period_start'   => $start->toDateString(),
                    'period_end'     => $end->toDateString(),
                    'form_data'      => json_encode([
                        'activities_summary' => "Activités du mois {$monthRef->isoFormat('MMMM YYYY')} : réunions, formations, sortie d'évangélisation.",
                        'attendance_avg'     => rand(30, 120),
                        'highlights'         => [
                            'Témoignage marquant d\'un nouveau converti',
                            'Réussite de la sortie communautaire',
                        ],
                        'challenges'         => 'Manque de matériel logistique pour les sorties extérieures.',
                        'budget_used'        => rand(50000, 250000),
                        'next_month_plan'    => 'Renforcer la formation des membres et organiser une retraite spirituelle.',
                    ]),
                    'status'         => $cfg['status'],
                    'submitted_at'   => $submittedAt,
                    'reviewed_by'    => $reviewedAt ? null : null, // assigné en vrai par admin
                    'reviewed_at'    => $reviewedAt,
                    'review_comment' => $cfg['status'] === 'approved'
                        ? 'Très bon rapport, continuez ainsi.'
                        : null,
                    'created_at'     => $submittedAt ?? $end,
                    'updated_at'     => $reviewedAt ?? $submittedAt ?? $end,
                ]);
                $count++;
            }
        }

        $this->command->info("  ✓ {$count} rapports département seedés (3 mois × {$departments->count()} départements)");
    }
}
