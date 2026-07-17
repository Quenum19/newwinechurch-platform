<?php

/**
 * Force le rafraîchissement de TOUS les caches PHP + Laravel après un déploiement.
 *
 * Ce script doit être placé dans /public_html/api/opcache-flush.php côté prod
 * (celui de /backend/public/opcache-flush.php côté DEV).
 *
 *   1. opcache_reset()   → vide le bytecode PHP compilé en mémoire
 *   2. clearstatcache()  → vide le cache de stat des fichiers PHP
 *   3. Supprime bootstrap/cache/*.php (config/routes/views/events/services/packages)
 *   4. Re-cache Laravel (config + routes + views + events) pour perf prod
 *
 * URL : https://api.newinechurch.org/opcache-flush.php?key=nwc-deploy-2026
 *
 * ⚠️  SUPPRIME ce fichier après usage pour éviter toute exposition publique.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    exit("Accès refusé.\n");
}

header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC — OpCache + Laravel cache flush\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// ─── Étape 1 : OpCache ────────────────────────────────────────────
echo "▸ 1. Reset OpCache (bytecode PHP compilé)\n";
if (function_exists('opcache_reset')) {
    $ok = opcache_reset();
    echo $ok ? "  ✅ opcache_reset() OK\n" : "  ⚠️  opcache_reset() a retourné false\n";
} else {
    echo "  ℹ️  OpCache non disponible sur ce serveur — étape sautée.\n";
}

// ─── Étape 2 : file stat cache PHP ────────────────────────────────
echo "\n▸ 2. clearstatcache()\n";
clearstatcache(true);
echo "  ✅ Cache stat fichiers vidé\n";

// ─── Étape 3 : caches Laravel sur disque ──────────────────────────
echo "\n▸ 3. Suppression physique bootstrap/cache/*.php\n";
$backend = realpath(__DIR__ . '/../../../../nwc_backend')
        ?: realpath(__DIR__ . '/..'); // Fallback dev

$cacheDir = "$backend/bootstrap/cache";
$files = ['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'];
foreach ($files as $f) {
    $path = "$cacheDir/$f";
    if (file_exists($path)) {
        @unlink($path);
        echo "  ✅ $f supprimé\n";
    } else {
        echo "  ・ $f absent (déjà propre)\n";
    }
}

// ─── Étape 4 : re-cache pour perf prod ─────────────────────────────
echo "\n▸ 4. Boot Laravel + re-cache\n";
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "  ✅ Laravel bootstrapé (config fraîche depuis .env)\n";

\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "  ✅ config + route + view + event caches régénérés\n";

// ─── Résumé ────────────────────────────────────────────────────────
echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Flush complet OK.\n";
echo "  → Le code PHP fraîchement uploadé est actif dès maintenant.\n";
echo "  → SUPPRIME opcache-flush.php après usage.\n";
echo "═══════════════════════════════════════════════════════════════\n";
