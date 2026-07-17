<?php

/**
 * ==============================================================
 *  NEW WINE CHURCH — Optimisation complète Hostinger (one-shot)
 *
 *  Place ce fichier dans : public_html/api/fix-storage.php
 *  Visite : https://api.newinechurch.org/fix-storage.php?key=nwc-deploy-2026
 *
 *  Actions automatiques :
 *   1. Crée public_html/api/storage/ (nouveau root disque public)
 *   2. Migre les fichiers existants depuis nwc_backend/storage/app/public/
 *   3. Crée/met à jour .user.ini avec limites PHP optimales
 *   4. Reset les entrées DB seed pointant vers fichiers cassés
 *   5. Re-cache config + routes + views
 *   6. Audit perf : OPcache, queue worker, durée requêtes
 *   7. Rapport final
 *
 *  ⚠️ SUPPRIME APRÈS USAGE
 * ==============================================================
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';
$T0 = microtime(true);

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    exit('Accès refusé.');
}

header('Content-Type: text/plain; charset=utf-8');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC — Optimisation complète Hostinger\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if ($backend === false || ! is_dir($backend)) {
    exit("❌ nwc_backend introuvable. Abandon.\n");
}

$warnings = [];

// =============================================================
// 1. .user.ini — limites PHP optimisées pour les uploads admin
// =============================================================
echo "▸ [1/7] Configuration .user.ini\n";
$userIni = __DIR__ . '/.user.ini';
$nwcRules = <<<'INI'

; --- NWC overrides (uploads admin) ---
upload_max_filesize = 32M
post_max_size = 64M
memory_limit = 256M
max_execution_time = 120
max_input_time = 60
display_errors = Off
log_errors = On

INI;

if (file_exists($userIni)) {
    $current = file_get_contents($userIni);
    if (strpos($current, 'NWC overrides') === false) {
        if (file_put_contents($userIni, $current . $nwcRules) !== false) {
            echo "  ✅ Règles NWC ajoutées au .user.ini existant\n";
        } else {
            $warnings[] = "Impossible d'écrire .user.ini (perms?)";
            echo "  ⚠️  Écriture .user.ini échouée\n";
        }
    } else {
        echo "  • .user.ini contient déjà nos règles\n";
    }
} else {
    if (file_put_contents($userIni, "; NWC PHP overrides\n" . $nwcRules) !== false) {
        echo "  ✅ .user.ini créé\n";
    } else {
        $warnings[] = "Impossible de créer .user.ini";
        echo "  ⚠️  Création .user.ini échouée\n";
    }
}
echo "  Note: Hostinger recharge .user.ini ~5 min après modification.\n\n";

// =============================================================
// 2. Création public_html/api/storage/ + arborescence
// =============================================================
echo "▸ [2/7] Création du nouveau root disque public\n";
$newRoot = __DIR__ . '/storage';
$oldRoot = "$backend/storage/app/public";

if (! is_dir($newRoot)) {
    if (@mkdir($newRoot, 0775, true)) {
        echo "  ✅ public_html/api/storage/ créé\n";
    } else {
        exit("  ❌ Création impossible. Crée-le manuellement via FileZilla (775).\n");
    }
} else {
    echo "  • public_html/api/storage/ existe déjà\n";
}
@chmod($newRoot, 0775);

// Sous-dossiers utiles (Spatie crée à la volée mais on les pré-pose en 775)
foreach (['operators', 'auth-hero', 'sermons', 'events', 'posts', 'branding', 'gallery', 'tmp-uploads'] as $sub) {
    $path = "$newRoot/$sub";
    if (! is_dir($path)) @mkdir($path, 0775, true);
    @chmod($path, 0775);
}
echo "  ✅ Sous-dossiers créés (operators, auth-hero, sermons, etc.)\n\n";

// =============================================================
// 3. Migration des fichiers existants
// =============================================================
echo "▸ [3/7] Migration des uploads existants\n";
$copied = 0; $skipped = 0; $errors = 0;

if (is_dir($oldRoot)) {
    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($oldRoot, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($iter as $item) {
        $rel = substr($item->getPathname(), strlen($oldRoot) + 1);
        $rel = str_replace('\\', '/', $rel);
        $target = $newRoot . '/' . $rel;

        if ($item->isDir()) {
            if (! is_dir($target)) @mkdir($target, 0775, true);
            continue;
        }
        if (file_exists($target)) { $skipped++; continue; }
        if (@copy($item->getPathname(), $target)) {
            @chmod($target, 0664);
            $copied++;
        } else { $errors++; }
    }
    echo "  ✅ $copied copiés, $skipped déjà présents, $errors erreurs\n";
} else {
    echo "  • Pas de source à migrer (nwc_backend/storage/app/public absent)\n";
}
echo "\n";

// =============================================================
// 4. Boot Laravel pour la suite
// =============================================================
echo "▸ [4/7] Boot Laravel + clear caches\n";
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('view:clear');
echo "  ✅ Caches vidés\n\n";

// =============================================================
// 5. Vérifications config (FILESYSTEM_PUBLIC_ROOT, MAIL, DB)
// =============================================================
echo "▸ [5/7] Vérifications config production\n";
$root = config('filesystems.disks.public.root');
echo "  Disque public root : $root\n";
if (strpos($root, 'public_html/api/storage') === false) {
    $warnings[] = "FILESYSTEM_PUBLIC_ROOT pas pris en compte — vérifie .env";
    echo "  ⚠️  L'env FILESYSTEM_PUBLIC_ROOT n'est PAS pris en compte\n";
} else {
    echo "  ✅ Disque public pointé vers public_html/api/storage\n";
}

$queueConn = config('queue.default');
echo "  Queue connection : $queueConn\n";
if ($queueConn !== 'database') {
    $warnings[] = "Queue devrait être 'database' pour Hostinger (worker via cron)";
}

$mailHost = config('mail.mailers.smtp.host');
$mailUser = config('mail.mailers.smtp.username');
echo "  SMTP host : $mailHost\n";
echo "  SMTP user : $mailUser\n";

// Test connexion DB
try {
    \Illuminate\Support\Facades\DB::connection()->getPdo();
    echo "  ✅ MySQL connecté\n";
} catch (Throwable $e) {
    $warnings[] = "DB indisponible : " . $e->getMessage();
    echo "  ❌ MySQL KO : " . $e->getMessage() . "\n";
}
echo "\n";

// =============================================================
// 6. Nettoyage DB : entrées seed cassées
// =============================================================
echo "▸ [6/7] Nettoyage entrées DB pointant vers fichiers absents\n";

$authBroken = \App\Models\AuthImage::all()->filter(function ($img) {
    return ! \Illuminate\Support\Facades\Storage::disk('public')->exists($img->path);
});
echo "  auth_images cassés : " . $authBroken->count() . "\n";
$authBroken->each(function ($img) {
    echo "    → suppression #{$img->id} ({$img->title})\n";
    $img->delete();
});

$donBroken = \App\Models\DonationMethod::whereNotNull('logo_path')->get()->filter(function ($m) {
    return ! \Illuminate\Support\Facades\Storage::disk('public')->exists($m->logo_path);
});
echo "  donation_methods avec logo cassé : " . $donBroken->count() . "\n";
$donBroken->each(function ($m) {
    echo "    → reset logo_path #{$m->id} ({$m->name})\n";
    $m->update(['logo_path' => null]);
});
echo "\n";

// =============================================================
// 7. Re-cache config/routes/views pour perfs prod
// =============================================================
echo "▸ [7/7] Re-cache pour perfs prod\n";
\Illuminate\Support\Facades\Artisan::call('config:cache');
echo "  ✅ config:cache\n";
\Illuminate\Support\Facades\Artisan::call('route:cache');
echo "  ✅ route:cache\n";
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "  ✅ view:cache\n";
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "  ✅ event:cache\n\n";

// =============================================================
// AUDIT PERFORMANCE
// =============================================================
echo "═══════════════════════════════════════════════════════════════\n";
echo "  AUDIT PERFORMANCE\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "▸ Versions logicielles\n";
echo "  PHP : " . PHP_VERSION . "\n";
echo "  Laravel : " . \Illuminate\Foundation\Application::VERSION . "\n";
echo "\n";

echo "▸ OPcache (clé pour la perf Laravel)\n";
if (function_exists('opcache_get_status')) {
    $oc = @opcache_get_status(false);
    if ($oc && ! empty($oc['opcache_enabled'])) {
        $hitRate = isset($oc['opcache_statistics']['opcache_hit_rate'])
            ? round($oc['opcache_statistics']['opcache_hit_rate'], 1) . '%'
            : 'n/a';
        echo "  ✅ OPcache ACTIF — hit rate $hitRate\n";
    } else {
        $warnings[] = "OPcache désactivé — Laravel sera lent";
        echo "  ⚠️  OPcache désactivé\n";
    }
} else {
    echo "  • opcache_get_status indisponible (extension peut-être désactivée)\n";
}
echo "\n";

echo "▸ Limites PHP courantes\n";
echo "  upload_max_filesize : " . ini_get('upload_max_filesize') . " (cible ≥ 32M)\n";
echo "  post_max_size       : " . ini_get('post_max_size') . " (cible ≥ 64M)\n";
echo "  memory_limit        : " . ini_get('memory_limit') . " (cible ≥ 256M)\n";
echo "  max_execution_time  : " . ini_get('max_execution_time') . "s (cible ≥ 120s)\n";
echo "\n";

echo "▸ Test écriture/lecture/serveur public_html/api/storage/\n";
$probe = "$newRoot/.nwc-perf-test.txt";
$content = str_repeat('x', 1024); // 1 Ko
$writeStart = microtime(true);
$writeOk = (file_put_contents($probe, $content) !== false);
$writeMs = round((microtime(true) - $writeStart) * 1000, 2);

$readStart = microtime(true);
$readContent = @file_get_contents($probe);
$readMs = round((microtime(true) - $readStart) * 1000, 2);
$readOk = ($readContent === $content);

@unlink($probe);

echo "  Écriture 1 Ko : $writeMs ms " . ($writeOk ? '✅' : '❌') . "\n";
echo "  Lecture 1 Ko  : $readMs ms " . ($readOk ? '✅' : '❌') . "\n";
echo "\n";

echo "▸ Queue worker (cron)\n";
$pendingJobs = \Illuminate\Support\Facades\DB::table('jobs')->count();
$failedJobs  = \Illuminate\Support\Facades\DB::table('failed_jobs')->count();
echo "  Jobs en attente : $pendingJobs\n";
echo "  Jobs échoués     : $failedJobs\n";
if ($failedJobs > 0) {
    $warnings[] = "$failedJobs jobs failed — vérifie storage/logs/laravel.log";
}
echo "\n";

// =============================================================
// RAPPORT FINAL
// =============================================================
$totalMs = round((microtime(true) - $T0) * 1000, 1);
echo "═══════════════════════════════════════════════════════════════\n";
echo "  RÉSUMÉ\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "  Durée totale du script : $totalMs ms\n\n";

if (empty($warnings)) {
    echo "  ✅ ✅ ✅  Optimisation complète — RIEN à corriger.\n\n";
} else {
    echo "  ⚠️  " . count($warnings) . " warnings à examiner :\n";
    foreach ($warnings as $w) echo "    • $w\n";
    echo "\n";
}

echo "  ÉTAPES SUIVANTES :\n";
echo "    1. SUPPRIME fix-storage.php via FileZilla (sécurité)\n";
echo "    2. Recharge https://newinechurch.org/admin/methodes-don\n";
echo "       → upload les 4 logos opérateurs (Apache servira direct, ~10ms/image)\n";
echo "    3. Recharge https://newinechurch.org/admin/images-auth\n";
echo "       → upload 1-2 photos hero NWC\n";
echo "    4. Recharge https://newinechurch.org/admin/evenements/nouveau\n";
echo "       → crée un événement avec image cover (queue worker fait les thumbs en async)\n";
echo "    5. Vérifie /donner et la connexion : les images doivent apparaître instantanément\n\n";
echo "═══════════════════════════════════════════════════════════════\n";
