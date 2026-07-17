<?php
/**
 * NWC Cleanup v3 — pas de migration, juste vérif fichiers + re-cache routes
 * (nouvelles routes /admin/members/bulk, /admin/departments/{id} POST, etc.)
 *
 * URL : https://api.newinechurch.org/nwc-cleanup-v3.php?key=nwc-cleanup-v3-2026
 * ⚠️ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-cleanup-v3-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(60);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Cleanup v3 — multi-bug fixes\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

// Vérif présence
$req = [
    'app/Models/Department.php'                                       => 'Model Department (accessors)',
    'app/Http/Resources/DepartmentResource.php'                       => 'Resource Department',
    'app/Http/Controllers/Admin/DepartmentsController.php'            => 'Admin DepartmentsController (filtre governor + upload bannière)',
    'app/Http/Controllers/Public/DepartmentController.php'            => 'Public DepartmentController (meta total + MediaResource)',
    'app/Http/Requests/Admin/UpdateDepartmentRequest.php'             => 'Request Update Dept (banner_image)',
    'app/Http/Controllers/Admin/MembersController.php'                => 'Admin MembersController (bulk + export ids)',
    'app/Exports/MembersExport.php'                                   => 'Export Members (ids + trashed)',
];
foreach ($req as $rel => $label) {
    echo file_exists("$backend/$rel") ? "  ✅ $label\n" : "  ❌ MANQUE : $label\n";
}
echo "\n";

// Suppression caches
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('cache:clear');
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "✅ Caches reconstruits.\n\n";

// Sanity check
try {
    $req = \Illuminate\Http\Request::create('/api/departments', 'GET');
    $resp = $app->handle($req);
    $body = json_decode($resp->getContent(), true);
    echo "▸ /api/departments → " . $resp->getStatusCode() . " — meta.total_count : " . ($body['meta']['total_count'] ?? 'absent') . "\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé. SUPPRIME ce fichier.\n";
echo "═══════════════════════════════════════════════════════════════\n";
