<?php
/**
 * NWC Archive Upgrade — déploie le système d'archivage sermons.
 *
 * Exécute :
 *  1. Migration external_speaker_name (prédicateur invité)
 *  2. Migration sermon_themes + pivot
 *  3. SermonThemesSeeder (27 thèmes officiels)
 *  4. RolesAndPermissionsSeeder (nouvelles perms : manage sermon series / themes)
 *  5. Re-cache config + routes + views + events
 *
 * URL : https://api.newinechurch.org/nwc-archive-upgrade.php?key=nwc-archive-2026
 * ⚠️ SUPPRIME ce fichier après usage.
 */

const DEPLOY_TOKEN = 'nwc-archive-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(120);
@ini_set('memory_limit', '256M');

header('Content-Type: text/plain; charset=utf-8');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Archive Upgrade — sermons : séries + thèmes\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend détecté : $backend\n\n";

// === 1. Vérif présence des fichiers requis ===
echo "▸ Vérification des fichiers attendus (uploads OK ?)\n";
$required = [
    'app/Models/SermonTheme.php'                                                => 'Modèle SermonTheme',
    'app/Http/Controllers/Admin/SermonSeriesController.php'                     => 'Controller Séries',
    'app/Http/Controllers/Admin/SermonThemesController.php'                     => 'Controller Thèmes',
    'app/Http/Resources/SermonThemeResource.php'                                => 'Resource Thème',
    'database/seeders/SermonThemesSeeder.php'                                   => 'Seeder Thèmes',
    'database/migrations/2026_06_14_120000_add_external_speaker_name_to_sermons_table.php' => 'Migration external_speaker',
    'database/migrations/2026_06_14_130000_create_sermon_themes_table.php'      => 'Migration sermon_themes',
];
$missing = [];
foreach ($required as $rel => $label) {
    $full = "$backend/$rel";
    if (file_exists($full)) {
        echo "  ✅ $label\n";
    } else {
        echo "  ❌ MANQUE : $label ($rel)\n";
        $missing[] = $rel;
    }
}
if (! empty($missing)) {
    echo "\n⛔ Upload incomplet. Re-upload les fichiers manquants avant de lancer ce script.\n";
    exit;
}
echo "\n";

// === 2. Suppression caches AVANT boot (force re-lecture du code) ===
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
    exit("  ❌ Boot failed : " . $e->getMessage() . "\n" . $e->getFile() . ':' . $e->getLine() . "\n");
}

// === 4. Migrations ===
echo "▸ Migrations (php artisan migrate)\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    $output = \Illuminate\Support\Facades\Artisan::output();
    foreach (explode("\n", trim($output)) as $line) {
        echo "  $line\n";
    }
    echo $exitCode === 0 ? "  ✅ Migrations OK\n" : "  ⚠️  Code retour : $exitCode\n";
} catch (Throwable $e) {
    echo "  ❌ Migration error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 5. Seeder thèmes officiels ===
echo "▸ Seed SermonThemesSeeder (27 thèmes officiels)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\SermonThemesSeeder',
        '--force' => true,
    ]);
    $count = \DB::table('sermon_themes')->count();
    $defaults = \DB::table('sermon_themes')->where('is_default', 1)->count();
    echo "  ✅ $count thèmes en base — $defaults officiels\n";
} catch (Throwable $e) {
    echo "  ❌ Seed thèmes error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Seeder permissions (rôles + nouvelles perms) ===
echo "▸ Seed RolesAndPermissionsSeeder (manage sermon series / themes)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
        '--force' => true,
    ]);
    $hasSeriesPerm = \DB::table('permissions')->where('name', 'manage sermon series')->exists();
    $hasThemesPerm = \DB::table('permissions')->where('name', 'manage sermon themes')->exists();
    echo "  Permission 'manage sermon series' : " . ($hasSeriesPerm ? '✅' : '❌') . "\n";
    echo "  Permission 'manage sermon themes' : " . ($hasThemesPerm ? '✅' : '❌') . "\n";
} catch (Throwable $e) {
    echo "  ❌ Seed perms error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 7. Re-cache propre ===
echo "▸ Re-cache (config + routes + views + events)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    echo "  ✅ Cleared\n";
    \Illuminate\Support\Facades\Artisan::call('config:cache');
    \Illuminate\Support\Facades\Artisan::call('route:cache');
    \Illuminate\Support\Facades\Artisan::call('view:cache');
    \Illuminate\Support\Facades\Artisan::call('event:cache');
    echo "  ✅ Re-cached\n";
} catch (Throwable $e) {
    echo "  ❌ Cache error : " . $e->getMessage() . "\n";
}
echo "\n";

// === 8. Reset Spatie permission cache (sinon les rôles ne voient pas les nouvelles perms) ===
echo "▸ Reset cache Spatie permissions\n";
try {
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    echo "  ✅ Cache permissions invalidé\n";
} catch (Throwable $e) {
    echo "  ⚠️  " . $e->getMessage() . "\n";
}
echo "\n";

// === 9. Vérif finale : que les rôles ont bien les nouvelles permissions ===
echo "▸ Vérif assignation aux rôles\n";
foreach (['superadmin', 'admin', 'admin-site'] as $roleName) {
    $role = \Spatie\Permission\Models\Role::where('name', $roleName)->first();
    if (! $role) { echo "  • $roleName : rôle absent\n"; continue; }
    $perms = $role->permissions->pluck('name');
    $hasSeries = $perms->contains('manage sermon series');
    $hasThemes = $perms->contains('manage sermon themes');
    echo "  $roleName : series " . ($hasSeries ? '✅' : '❌') . " | themes " . ($hasThemes ? '✅' : '❌') . "\n";
}
echo "\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé.\n";
echo "  → Teste : /admin/sermons/series et /admin/sermons/themes\n";
echo "  → SUPPRIME nwc-archive-upgrade.php après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
