<?php
/**
 * NWC Gallery Fix — clear caches après upload des nouveaux fichiers
 * (MediaGalleryResource, EventsController.media, Event::media() relation).
 *
 * URL : https://api.newinechurch.org/nwc-gallery-fix.php?key=nwc-gallery-fix-2026
 * ⚠️ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-gallery-fix-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(60);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Gallery Fix — caches\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// Vérif présence
$req = [
    'app/Http/Resources/MediaGalleryResource.php'                 => 'Resource Media',
    'app/Http/Controllers/Admin/MediaGalleryController.php'       => 'Admin MediaController',
    'app/Http/Controllers/Public/MediaGalleryController.php'      => 'Public MediaController',
    'app/Http/Controllers/Public/EventController.php'             => 'Public EventController',
    'app/Http/Controllers/Admin/EventsController.php'             => 'Admin EventsController',
    'app/Http/Resources/EventResource.php'                        => 'Resource Event',
    'app/Models/Event.php'                                        => 'Model Event',
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
    $req = \Illuminate\Http\Request::create('/api/media', 'GET');
    $resp = $app->handle($req);
    echo "▸ /api/media → status " . $resp->getStatusCode() . "\n";
    if ($resp->getStatusCode() === 200) {
        $body = json_decode($resp->getContent(), true);
        $count = count($body['data'] ?? []);
        echo "  ✅ $count médias renvoyés\n";
        if ($count > 0) {
            $first = $body['data'][0];
            echo "  Premier file_path : " . ($first['file_path'] ?? 'null') . "\n";
            echo "  → doit commencer par https://api.newinechurch.org/storage/\n";
        }
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé. SUPPRIME ce fichier.\n";
echo "═══════════════════════════════════════════════════════════════\n";
