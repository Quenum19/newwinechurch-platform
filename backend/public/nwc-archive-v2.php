<?php
/**
 * NWC Archive Upgrade v2 — refonte complète sermons (séries/thèmes) +
 * corrections bugs événements.
 *
 * Exécute :
 *  1. Vérification fichiers backend
 *  2. Migrations en attente
 *  3. Seeder thèmes officiels (idempotent — relançable sans danger)
 *  4. Seeder permissions (manage sermon series / themes)
 *  5. Reset cache Spatie permissions
 *  6. Re-cache config / routes / vues / events
 *
 * URL : https://api.newinechurch.org/nwc-archive-v2.php?key=nwc-archive-v2-2026
 * ⚠️ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-archive-v2-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
@ini_set('memory_limit', '256M');

header('Content-Type: text/plain; charset=utf-8');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Archive Upgrade v2 — refonte sermons + fix events\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend détecté : $backend\n\n";

// === 1. Vérif présence fichiers backend (uploads OK ?) ===
echo "▸ Vérification des fichiers attendus\n";
$required = [
    'app/Models/SermonTheme.php'                                                            => 'Modèle SermonTheme',
    'app/Http/Controllers/Admin/SermonSeriesController.php'                                 => 'Admin SeriesController',
    'app/Http/Controllers/Admin/SermonThemesController.php'                                 => 'Admin ThemesController',
    'app/Http/Controllers/Public/SermonThemeController.php'                                 => 'Public ThemeController',
    'app/Http/Resources/SermonThemeResource.php'                                            => 'Resource Theme',
    'database/seeders/SermonThemesSeeder.php'                                               => 'Seeder Thèmes',
    'database/migrations/2026_06_14_120000_add_external_speaker_name_to_sermons_table.php'  => 'Migration external_speaker',
    'database/migrations/2026_06_14_130000_create_sermon_themes_table.php'                  => 'Migration sermon_themes',
];
$missing = [];
foreach ($required as $rel => $label) {
    if (file_exists("$backend/$rel")) {
        echo "  ✅ $label\n";
    } else {
        echo "  ❌ MANQUE : $label ($rel)\n";
        $missing[] = $rel;
    }
}
if (! empty($missing)) {
    echo "\n⛔ Upload incomplet. Upload les fichiers manquants avant de relancer.\n";
    exit;
}
echo "\n";

// === 2. Suppression caches AVANT boot ===
echo "▸ Nettoyage caches bootstrap\n";
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

// === 3. Boot Laravel ===
echo "▸ Boot Laravel\n";
try {
    require "$backend/vendor/autoload.php";
    $app = require_once "$backend/bootstrap/app.php";
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo "  ✅ Boot OK\n\n";
} catch (Throwable $e) {
    exit("  ❌ Boot failed : " . $e->getMessage() . "\n");
}

// === 4. Migrations ===
echo "▸ Migrations\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ Migration error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 5. Seeder thèmes ===
echo "▸ Seed SermonThemesSeeder\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\SermonThemesSeeder',
        '--force' => true,
    ]);
    $total    = \DB::table('sermon_themes')->count();
    $defaults = \DB::table('sermon_themes')->where('is_default', 1)->count();
    echo "  ✅ $total thèmes en base ($defaults officiels)\n";
} catch (Throwable $e) {
    echo "  ❌ Seed thèmes error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Seeder permissions ===
echo "▸ Seed RolesAndPermissionsSeeder (manage sermon series / themes)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
        '--force' => true,
    ]);
    foreach (['manage sermon series', 'manage sermon themes'] as $perm) {
        $exists = \DB::table('permissions')->where('name', $perm)->exists();
        echo "  $perm : " . ($exists ? '✅' : '❌') . "\n";
    }
} catch (Throwable $e) {
    echo "  ❌ Seed perms error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 7. Reset cache Spatie + re-cache Laravel ===
echo "▸ Reset cache permissions + re-cache Laravel\n";
try {
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    \Illuminate\Support\Facades\Artisan::call('config:cache');
    \Illuminate\Support\Facades\Artisan::call('route:cache');
    \Illuminate\Support\Facades\Artisan::call('view:cache');
    \Illuminate\Support\Facades\Artisan::call('event:cache');
    echo "  ✅ Caches OK\n";
} catch (Throwable $e) {
    echo "  ❌ Cache error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 8. Vérif assignation des permissions aux rôles ===
echo "▸ Vérif rôles\n";
foreach (['superadmin', 'admin', 'admin-site'] as $roleName) {
    $role = \Spatie\Permission\Models\Role::where('name', $roleName)->first();
    if (! $role) { echo "  • $roleName : absent\n"; continue; }
    $perms = $role->permissions->pluck('name');
    echo "  $roleName : series " . ($perms->contains('manage sermon series') ? '✅' : '❌')
       . " | themes " . ($perms->contains('manage sermon themes') ? '✅' : '❌') . "\n";
}
echo "\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé.\n";
echo "  → /admin/sermons (colonnes série + thèmes + filtres)\n";
echo "  → /admin/sermons/series (catalogue d'albums)\n";
echo "  → /admin/sermons/themes (catalogue de tags)\n";
echo "  → /messages (filtres avancés + cards refondues)\n";
echo "  → /messages/series/{slug} (page album publique)\n";
echo "  → /admin/evenements (toggle publier + filtres + Modal)\n";
echo "  → /evenements (onglet 'Tous' par défaut + badges)\n";
echo "  → SUPPRIME nwc-archive-v2.php après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
