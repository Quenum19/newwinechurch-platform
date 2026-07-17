<?php
/**
 * NWC Finalize — re-cache propre + diagnostic 500
 * URL : https://api.newinechurch.org/nwc-finalize.php?key=nwc-deploy-2026
 * ⚠️ SUPPRIME après usage.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé. Token reçu : '" . ($_GET['key'] ?? '') . "'\n");
}

header('Content-Type: text/plain; charset=utf-8');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Finalize — re-cache + diagnostic\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

// === 1. Vérif .env brut ===
echo "▸ Vérif .env\n";
$envFile = "$backend/.env";
if (! file_exists($envFile)) exit("  ❌ .env absent.\n");
$envContent = file_get_contents($envFile);
$hasFsRoot = strpos($envContent, 'FILESYSTEM_PUBLIC_ROOT=') !== false;
echo "  FILESYSTEM_PUBLIC_ROOT dans .env : " . ($hasFsRoot ? '✅ présent' : '❌ ABSENT') . "\n";
if ($hasFsRoot) {
    preg_match('/^FILESYSTEM_PUBLIC_ROOT=(.*)$/m', $envContent, $m);
    echo "  Valeur : " . trim($m[1] ?? '') . "\n";
}
echo "\n";

// === 2. Suppression PHYSIQUE caches AVANT boot ===
echo "▸ Suppression physique caches (force re-lecture .env)\n";
foreach (['config.php','routes-v7.php','services.php','packages.php','events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
    else { echo "  • $f déjà absent\n"; }
}
echo "\n";

// === 3. Boot Laravel propre ===
echo "▸ Boot Laravel\n";
try {
    require "$backend/vendor/autoload.php";
    $app = require_once "$backend/bootstrap/app.php";
    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo "  ✅ Boot OK\n";
} catch (Throwable $e) {
    echo "  ❌ Boot failed : " . $e->getMessage() . "\n";
    echo "  " . $e->getFile() . ':' . $e->getLine() . "\n";
    exit;
}
echo "\n";

// === 4. Vérif config en mémoire (fraîche depuis .env) ===
echo "▸ Config en mémoire (fraîche)\n";
$root = config('filesystems.disks.public.root');
echo "  Disque public root : $root\n";
$ok = (strpos($root, 'public_html/api/storage') !== false);
echo "  Bonne valeur (public_html/api/storage) : " . ($ok ? '✅ OUI' : '❌ NON') . "\n\n";

// === 5. Test endpoint API en interne (simule une requête) ===
echo "▸ Test endpoint /api/donation-methods en interne\n";
try {
    $req = \Illuminate\Http\Request::create('/api/donation-methods', 'GET');
    $resp = $app->handle($req);
    echo "  Status : " . $resp->getStatusCode() . "\n";
    if ($resp->getStatusCode() !== 200) {
        $body = $resp->getContent();
        echo "  Body (300 chars) : " . substr($body, 0, 300) . "\n";
    } else {
        $data = json_decode($resp->getContent(), true);
        echo "  ✅ JSON OK — " . count($data['data'] ?? []) . " méthodes\n";
    }
} catch (Throwable $e) {
    echo "  ❌ Exception : " . $e->getMessage() . "\n";
    echo "  Trace : " . $e->getFile() . ':' . $e->getLine() . "\n";
    echo "  Stack : " . substr($e->getTraceAsString(), 0, 500) . "\n";
}
echo "\n";

// === 6. Re-cache propre ===
echo "▸ Re-cache (config + routes + views + events)\n";
\Illuminate\Support\Facades\Artisan::call('config:cache');
echo "  ✅ config:cache\n";
\Illuminate\Support\Facades\Artisan::call('route:cache');
echo "  ✅ route:cache\n";
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "  ✅ view:cache\n";
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "  ✅ event:cache\n\n";

// === 7. Dernière ligne du log Laravel (si erreur) ===
echo "▸ 20 dernières lignes du log Laravel\n";
$logDir = "$backend/storage/logs";
$logs = glob("$logDir/laravel-*.log");
if (! empty($logs)) {
    rsort($logs);
    $lastLog = $logs[0];
    echo "  Fichier : " . basename($lastLog) . "\n";
    $lines = file($lastLog);
    $tail = array_slice($lines, -20);
    echo "  ─── tail ───\n";
    foreach ($tail as $l) echo "  " . $l;
} else {
    echo "  • Pas de fichier log encore\n";
}
echo "\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Terminé. SUPPRIME nwc-finalize.php.\n";
echo "═══════════════════════════════════════════════════════════════\n";
