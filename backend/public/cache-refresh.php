<?php

/**
 * Mini script — force un re-cache propre de la config Laravel.
 *
 * À utiliser après modification de .env (ex: ajout FILESYSTEM_PUBLIC_ROOT)
 * pour s'assurer que le cache config sur disque a la BONNE valeur.
 *
 * Différence avec fix-storage.php : on supprime physiquement les fichiers
 * cache AVANT de booter Laravel → la nouvelle valeur .env est lue depuis 0.
 *
 * URL : https://api.newinechurch.org/cache-refresh.php?key=nwc-deploy-2026
 * ⚠️ SUPPRIME après usage.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    exit('Accès refusé.');
}

header('Content-Type: text/plain; charset=utf-8');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC — Cache refresh forcé\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

// Suppression PHYSIQUE des caches AVANT boot (la clé du fix)
echo "▸ Suppression physique des caches sur disque\n";
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $path = "$backend/bootstrap/cache/$f";
    if (file_exists($path)) {
        @unlink($path);
        echo "  ✅ $f supprimé\n";
    }
}
echo "\n";

echo "▸ Boot Laravel propre (sans cache)\n";
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "  ✅ Boot OK\n\n";

echo "▸ Lecture config (frais depuis .env + config/*.php)\n";
$root = config('filesystems.disks.public.root');
echo "  Disque public root : $root\n";
$envRoot = env('FILESYSTEM_PUBLIC_ROOT');
echo "  env() FILESYSTEM_PUBLIC_ROOT : " . ($envRoot ?: '(null)') . "\n";

if (strpos($root, 'public_html/api/storage') !== false) {
    echo "  ✅ Disque public pointe vers le BON emplacement\n\n";
} else {
    echo "  ⚠️  Disque public pointe encore vers nwc_backend/storage\n";
    echo "      → Re-vérifie que ta ligne dans .env est :\n";
    echo "      FILESYSTEM_PUBLIC_ROOT=/home/u781799599/domains/newinechurch.org/public_html/api/storage\n\n";
}

echo "▸ Re-cache pour perfs prod\n";
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "  ✅ config + route + view + event caches refresh\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Cache rafraîchi.\n";
echo "  → Va dans admin/methodes-don, upload un logo, il sera servi rapidement.\n";
echo "  → SUPPRIME cache-refresh.php après usage.\n";
echo "═══════════════════════════════════════════════════════════════\n";
