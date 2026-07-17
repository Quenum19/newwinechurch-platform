<?php
/**
 * NWC Home Refonte — déploie la refonte page d'accueil :
 *  - Migration table testimonials
 *  - Permission "manage testimonials"
 *  - Re-cache routes (nouvelles routes /api/testimonials, /admin/testimonials, etc.)
 *
 * URL : https://api.newinechurch.org/nwc-home-refonte.php?key=nwc-home-2026
 * ⚠️ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-home-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(120);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Home Refonte — testimonials + hero video + gallery random\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// Vérif présence
$req = [
    'app/Models/Testimonial.php'                                                       => 'Model Testimonial',
    'app/Http/Resources/TestimonialResource.php'                                       => 'Resource Testimonial',
    'app/Http/Controllers/Admin/TestimonialsController.php'                            => 'Admin TestimonialsController',
    'app/Http/Controllers/Public/TestimonialController.php'                            => 'Public TestimonialController',
    'database/migrations/2026_06_15_100000_create_testimonials_table.php'              => 'Migration testimonials',
    'app/Http/Controllers/Admin/SettingsController.php'                                => 'Admin SettingsController (hero_video)',
    'app/Http/Controllers/Public/MediaGalleryController.php'                           => 'Public MediaController (random)',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) {
        echo "  ✅ $label\n";
    } else {
        echo "  ❌ $label MANQUE ($rel)\n";
        $missing[] = $rel;
    }
}
if ($missing) exit("\n⛔ Re-upload les fichiers manquants.\n");
echo "\n";

// Suppression caches AVANT boot
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// === Migrations ===
echo "▸ Migrations\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === Permissions ===
echo "▸ Seed permissions (manage testimonials)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
        '--force' => true,
    ]);
    $has = \DB::table('permissions')->where('name', 'manage testimonials')->exists();
    echo "  Permission 'manage testimonials' : " . ($has ? '✅' : '❌') . "\n";

    // Reset cache Spatie pour activer immédiatement
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    echo "  ✅ Cache permissions invalidé\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === Re-cache complet ===
\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('cache:clear');
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "✅ Caches reconstruits.\n\n";

// === Vérif rôles ===
foreach (['superadmin', 'admin', 'admin-site'] as $roleName) {
    $role = \Spatie\Permission\Models\Role::where('name', $roleName)->first();
    if (! $role) continue;
    $has = $role->permissions->contains('name', 'manage testimonials');
    echo "  $roleName : manage testimonials " . ($has ? '✅' : '❌') . "\n";
}
echo "\n";

// === Sanity check ===
try {
    $req = \Illuminate\Http\Request::create('/api/testimonials', 'GET');
    $resp = $app->handle($req);
    echo "▸ /api/testimonials → status " . $resp->getStatusCode() . "\n";
    if ($resp->getStatusCode() === 200) {
        $body = json_decode($resp->getContent(), true);
        echo "  ✅ " . count($body['data'] ?? []) . " témoignages renvoyés (0 attendu pour début)\n";
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé.\n";
echo "  → Admin : /admin/temoignages (créer témoignages)\n";
echo "  → Admin : /admin/parametres (uploader vidéo hero)\n";
echo "  → Public : / (page d'accueil avec nouveaux composants)\n";
echo "  → SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
