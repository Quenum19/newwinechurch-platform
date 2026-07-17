<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder PRODUCTION — uniquement les données structurelles essentielles.
 *
 * À utiliser pour bootstrap une base prod toute neuve :
 *   php artisan db:seed --class=ProdDatabaseSeeder --force
 *
 * Inclus :
 *   - Rôles + permissions (essentiel pour le système d'auth)
 *   - 1 superadmin (admin@newinechurch.org / mot de passe à CHANGER immédiatement)
 *   - 50 départements (structure, sans gouverneurs assignés)
 *   - Catégories de blog (5)
 *   - Méthodes de don (Mobile Money operators)
 *   - Settings site (nom, logo, etc.)
 *   - Images auth (hero login)
 *   - Templates de rapport par département
 *
 * NON inclus (volontairement) :
 *   - Users factices, gouverneurs/leaders factices
 *   - Sermons, événements, articles d'exemple
 *   - Cellules, rapports, présences
 *   - Pivot events↔departments, médias d'exemple
 *
 *  Ces données seront créées par les utilisateurs réels via l'interface admin
 *  une fois en production. Cf. DatabaseSeeder pour la version dev complète.
 */
class ProdDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,            // ⚠️ Mot de passe par défaut — À CHANGER immédiatement
            SettingsSeeder::class,
            PostCategorySeeder::class,
            DonationMethodsSeeder::class,
            AuthImagesSeeder::class,
            DepartmentSeeder::class,
            ReportTemplatesSeeder::class,
        ]);

        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('  ✅ NEW WINE CHURCH — Base PROD initialisée');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('  ⚠️  CHANGER LES MOTS DE PASSE IMMÉDIATEMENT :');
        $this->command->info('     admin@newinechurch.org    / Admin@NWC2025!');
        $this->command->info('     pasteur@newinechurch.org  / Pasteur@NWC2025!');
        $this->command->info('     rh@newinechurch.org       / Rh@NWC2025!');
        $this->command->info('═══════════════════════════════════════════════════════');
    }
}
