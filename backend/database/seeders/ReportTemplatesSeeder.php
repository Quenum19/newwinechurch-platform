<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\DepartmentReportTemplate;
use Illuminate\Database\Seeder;

/**
 * Seeder — Templates de rapport par département.
 *
 * Pour l'instant, seed :
 *  - Le template "Planning des Cultes" complet (donné par l'utilisateur 2026-05-12)
 *  - Un template GÉNÉRIQUE pour tous les autres départements actifs
 *
 * L'admin pourra ensuite personnaliser chaque template via le builder visuel
 * (/admin/departements/:id/template).
 */
class ReportTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        $count = 0;

        // === 1) Planning des Cultes (template spécifique fourni) ===
        $planningDept = Department::where('slug', 'planning-et-gestion-des-cultes')->first();
        if ($planningDept) {
            DepartmentReportTemplate::updateOrCreate(
                ['department_id' => $planningDept->id, 'version' => 1],
                [
                    'name'      => 'Rapport hebdomadaire Planning des Cultes',
                    'frequency' => 'weekly',
                    'is_active' => true,
                    'schema'    => self::planningDesCultesSchema(),
                ]
            );
            $count++;
        }

        // === 2) Template générique pour les autres départements actifs ===
        $genericSchema = self::genericWeeklySchema();
        $others = Department::where('status', 'active')
            ->where('id', '!=', $planningDept?->id)
            ->get();

        foreach ($others as $dept) {
            DepartmentReportTemplate::updateOrCreate(
                ['department_id' => $dept->id, 'version' => 1],
                [
                    'name'      => 'Rapport hebdomadaire — '.$dept->name,
                    'frequency' => 'weekly',
                    'is_active' => true,
                    'schema'    => $genericSchema,
                ]
            );
            $count++;
        }

        $this->command->info("  ✓ {$count} templates de rapport seedés (1 spécifique + ".($count - 1)." génériques)");
    }

    /**
     * Schéma exact du rapport "Planning des Cultes" fourni par l'utilisateur.
     * 9 programmes × 4 colonnes (heure début, heure fin, respect timing, observations).
     */
    public static function planningDesCultesSchema(): array
    {
        return [
            [
                'title'  => 'Identité du rapport',
                'fields' => [
                    ['key' => 'periode',         'label' => 'Période (semaine du)',     'type' => 'text',     'required' => true, 'placeholder' => 'ex: Semaine du 5 au 11 mai 2026'],
                    ['key' => 'leader_name',     'label' => 'Nom du leader',            'type' => 'text',     'required' => true],
                    ['key' => 'date_edition',    'label' => 'Date d\'édition',          'type' => 'date',     'required' => true],
                    ['key' => 'heure_edition',   'label' => 'Heure d\'édition',         'type' => 'time'],
                    ['key' => 'impression',      'label' => 'Impression du planning',   'type' => 'yesno',    'help' => 'Le planning a-t-il été imprimé pour le culte ?'],
                ],
            ],
            [
                'title'  => 'Programmes du culte',
                'fields' => [
                    [
                        'key'   => 'programmes',
                        'label' => 'Détail par programme',
                        'type'  => 'table',
                        'rows'  => [
                            ['key' => 'montagne',       'label' => 'Montagne'],
                            ['key' => 'louange',        'label' => 'Louange'],
                            ['key' => 'dancing_star',   'label' => 'Dancing Star'],
                            ['key' => 'adoration',      'label' => 'Adoration'],
                            ['key' => 'dime_offrande',  'label' => 'Dîme et offrande'],
                            ['key' => 'annonce',        'label' => 'Annonce'],
                            ['key' => 'predication',    'label' => 'Prédication'],
                            ['key' => 'repas',          'label' => 'Repas'],
                            ['key' => 'reunion_leaders','label' => 'Réunion leaders'],
                        ],
                        'columns' => [
                            ['key' => 'heure_debut',   'label' => 'Heure début',     'type' => 'time'],
                            ['key' => 'heure_fin',     'label' => 'Heure fin',       'type' => 'time'],
                            ['key' => 'respect_timing','label' => 'Respect timing',  'type' => 'yesno'],
                            ['key' => 'observations',  'label' => 'Observations',    'type' => 'text',  'placeholder' => 'Remarques, ajustements…'],
                        ],
                    ],
                ],
            ],
            [
                'title'  => 'Signature',
                'fields' => [
                    ['key' => 'signature_leader', 'label' => 'Signature électronique du leader', 'type' => 'text', 'help' => 'Saisir son nom complet pour valider.', 'required' => true],
                ],
            ],
        ];
    }

    /**
     * Schéma générique applicable à tout département.
     * L'admin peut le surcharger via le builder visuel ensuite.
     */
    public static function genericWeeklySchema(): array
    {
        return [
            [
                'title'  => 'Identité',
                'fields' => [
                    ['key' => 'periode',     'label' => 'Période',         'type' => 'text', 'required' => true, 'placeholder' => 'Semaine du …'],
                    ['key' => 'leader_name', 'label' => 'Nom du leader',   'type' => 'text', 'required' => true],
                ],
            ],
            [
                'title'  => 'Activités de la semaine',
                'fields' => [
                    ['key' => 'activites_resume',  'label' => 'Résumé des activités',     'type' => 'textarea', 'rows' => 5, 'required' => true, 'placeholder' => 'Réunions, formations, sorties…'],
                    ['key' => 'nb_participants',   'label' => 'Nombre total de participants', 'type' => 'number', 'min' => 0],
                ],
            ],
            [
                'title'  => 'Points forts & défis',
                'fields' => [
                    ['key' => 'points_forts', 'label' => 'Points forts / témoignages', 'type' => 'textarea', 'rows' => 3, 'placeholder' => 'Bénédictions, succès…'],
                    ['key' => 'defis',        'label' => 'Défis rencontrés',           'type' => 'textarea', 'rows' => 3],
                    ['key' => 'besoins',      'label' => 'Besoins en soutien',         'type' => 'textarea', 'rows' => 2, 'help' => 'Ressources, formation, prière…'],
                ],
            ],
            [
                'title'  => 'Prévisions',
                'fields' => [
                    ['key' => 'plan_semaine_prochaine', 'label' => 'Plan pour la semaine prochaine', 'type' => 'textarea', 'rows' => 3],
                ],
            ],
        ];
    }
}
