<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Orchestrateur des seeders New Wine Church (Étape 1 refonte).
 *
 * Ordre IMPORTANT (dépendances FK + rôles) :
 *  1.  RolesAndPermissionsSeeder  — rôles refondus (gouverneur, leader, rh, etc.)
 *  2.  AdminUserSeeder            — admin + pasteur
 *  3.  SettingsSeeder             — paramètres site
 *  4.  PostCategorySeeder         — catégories blog
 *  5.  DepartmentSeeder           — 50 départements (sans gouverneur encore)
 *  6.  UserSeeder                 — 50 membres factices
 *  7.  SermonSeriesSeeder         — séries de prédications
 *  8.  SermonSeeder               — prédications
 *  9.  EventSeeder                — événements
 *  10. CellSeeder                 — cellules + leaders (cache leader_id)
 *  11. CellLeaderSeeder           — mandats historiques cell_leaders
 *  12. GovernorSeeder             — gouverneurs + governor_profiles + department_governors
 *  13. DepartmentReportSeeder     — 3 rapports/dept sur 3 mois (besoin gouverneur)
 *  14. CellReportSeeder           — 8 sem rapports/cellule (besoin leader)
 *  15. CellAttendanceSeeder       — présences sur 8 semaines
 *  16. PostSeeder                 — articles
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,
            SettingsSeeder::class,
            PostCategorySeeder::class,
            DonationMethodsSeeder::class,
            AuthImagesSeeder::class,
            DepartmentSeeder::class,
            UserSeeder::class,
            SermonSeriesSeeder::class,
            SermonSeeder::class,
            EventSeeder::class,
            CellSeeder::class,
            CellLeaderSeeder::class,
            GovernorSeeder::class,
            ReportTemplatesSeeder::class,     // Templates de rapport par département (avant rapports)
            DepartmentReportSeeder::class,
            CellReportSeeder::class,
            CellAttendanceSeeder::class,
            EventDepartmentSeeder::class,     // Étape 5 : pivot events ↔ departments
            MediaGallerySeeder::class,        // Polish : médias rattachés aux dépts (galerie publique)
            MemberDepartmentSeeder::class,    // Polish : distribue membres simples aux dépts
            PostSeeder::class,
        ]);

        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('  ✅ NEW WINE CHURCH — Base de données initialisée');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('  Admin       : admin@newinechurch.org      / Admin@NWC2025!');
        $this->command->info('  Pasteur     : pasteur@newinechurch.org    / Pasteur@NWC2025!');
        $this->command->info('  RH          : rh@newinechurch.org         / Rh@NWC2025!');
        $this->command->info('  Membres     : *@nwc-test.org              / Membre@NWC2025!');
        $this->command->info('  Gouverneurs : gouverneur.*@nwc-test.org   / Gouverneur@NWC2025!');
        $this->command->info('═══════════════════════════════════════════════════════');
    }
}
