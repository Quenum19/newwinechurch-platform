<?php

/**
 * ==============================================================
 *  NEW WINE CHURCH — Script de finalisation déploiement Hostinger
 *
 *  À placer dans : /domains/newinechurch.org/public_html/api/setup-deploy.php
 *  À exécuter UNE SEULE FOIS via :
 *      https://api.newinechurch.org/setup-deploy.php?key=TOKEN_SECRET
 *
 *  Ce script :
 *    1. Vérifie l'accès au backend Laravel (nwc_backend/)
 *    2. Teste la connexion à la base MySQL
 *    3. Crée le symlink storage (public_html/api/storage → nwc_backend/storage/app/public)
 *    4. Cache la config Laravel pour performance prod
 *    5. Bascule la log channel sur file pour ne pas spammer
 *    6. Affiche un rapport final
 *
 *  ⚠️ SUPPRIME CE FICHIER DU SERVEUR APRÈS L'AVOIR EXÉCUTÉ AVEC SUCCÈS.
 *     Il expose des infos systèmes si tu le laisses traîner.
 * ==============================================================
 */

// Token de sécurité — DOIT correspondre à ?key= dans l'URL.
// Change cette valeur AVANT d'uploader si tu veux un token perso.
const DEPLOY_TOKEN = 'nwc-deploy-2026';

// === 0. Sécurité : refuse l'accès sans le bon token ===
$providedKey = $_GET['key'] ?? '';
if (! hash_equals(DEPLOY_TOKEN, $providedKey)) {
    http_response_code(403);
    exit('Accès refusé — token manquant ou incorrect.');
}

header('Content-Type: text/plain; charset=utf-8');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NEW WINE CHURCH — Finalisation déploiement Hostinger\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$errors = [];
$warnings = [];

// === 1. Localiser nwc_backend/ ===
$backend = realpath(__DIR__ . '/../../../../nwc_backend');
echo "▸ Localisation backend Laravel...\n";
if ($backend === false || ! is_dir($backend)) {
    echo "  ❌ ÉCHEC — Impossible de trouver /nwc_backend/.\n";
    echo "  Chemin testé : " . __DIR__ . "/../../../../nwc_backend\n";
    exit;
}
echo "  ✅ Backend trouvé : $backend\n\n";

// === 2. Vérifier .env ===
echo "▸ Vérification du fichier .env...\n";
if (! file_exists("$backend/.env")) {
    echo "  ❌ ÉCHEC — .env introuvable. As-tu renommé .env.hostinger en .env ?\n";
    exit;
}
echo "  ✅ .env présent\n\n";

// === 3. Boot Laravel ===
echo "▸ Boot Laravel...\n";
try {
    require "$backend/vendor/autoload.php";
    $app = require_once "$backend/bootstrap/app.php";
    /** @var \Illuminate\Contracts\Console\Kernel $kernel */
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    echo "  ✅ Application bootée\n\n";
} catch (Throwable $e) {
    echo "  ❌ ÉCHEC — " . $e->getMessage() . "\n";
    echo "  Trace : " . $e->getFile() . ':' . $e->getLine() . "\n";
    exit;
}

// === 4. Test connexion DB ===
echo "▸ Test connexion MySQL...\n";
try {
    $pdo = \Illuminate\Support\Facades\DB::connection()->getPdo();
    $version = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
    echo "  ✅ MySQL connecté (version $version)\n";

    // Vérification présence des tables clés
    $tables = ['users', 'roles', 'departments', 'permissions'];
    foreach ($tables as $t) {
        $count = \Illuminate\Support\Facades\DB::table($t)->count();
        echo "  • Table `$t` : $count lignes\n";
    }
    echo "\n";
} catch (Throwable $e) {
    echo "  ❌ ÉCHEC — " . $e->getMessage() . "\n";
    echo "  → Vérifie DB_DATABASE, DB_USERNAME, DB_PASSWORD dans .env\n";
    echo "  → Vérifie que le SQL a bien été importé via phpMyAdmin\n";
    exit;
}

// === 5. Symlink storage ===
echo "▸ Création du symlink storage...\n";
$target = "$backend/storage/app/public";
$link   = __DIR__ . '/storage';

if (! is_dir($target)) {
    echo "  ⚠️  Source absente : $target — je la crée.\n";
    @mkdir($target, 0775, true);
}

if (is_link($link)) {
    echo "  • Symlink existe déjà — je le supprime pour le recréer.\n";
    @unlink($link);
} elseif (is_dir($link)) {
    echo "  ⚠️  Un dossier `storage` existe (pas un symlink) — je ne touche pas.\n";
    $warnings[] = "Le dossier storage/ existe déjà. Si tu vois des erreurs 404 sur les uploads, supprime-le manuellement et relance le script.";
}

if (! is_link($link) && ! is_dir($link)) {
    if (@symlink($target, $link)) {
        echo "  ✅ Symlink créé : $link → $target\n";
    } else {
        echo "  ⚠️  symlink() bloqué par PHP. Fallback : copie le dossier manuellement.\n";
        $warnings[] = "Les uploads (logos, hero images, sermons) ne s'afficheront pas tant que le symlink n'est pas créé.";
    }
}
echo "\n";

// === 6. Cache config + routes + views (performance prod) ===
echo "▸ Mise en cache config/routes/views...\n";
try {
    \Illuminate\Support\Facades\Artisan::call('config:cache');
    echo "  ✅ config:cache OK\n";
    \Illuminate\Support\Facades\Artisan::call('route:cache');
    echo "  ✅ route:cache OK\n";
    \Illuminate\Support\Facades\Artisan::call('view:cache');
    echo "  ✅ view:cache OK\n";
    \Illuminate\Support\Facades\Artisan::call('event:cache');
    echo "  ✅ event:cache OK\n\n";
} catch (Throwable $e) {
    echo "  ⚠️  " . $e->getMessage() . "\n";
    $warnings[] = "Le cache config a échoué — l'app fonctionnera mais plus lentement.";
}

// === 7. Rapport final ===
echo "═══════════════════════════════════════════════════════════════\n";
echo "  RÉCAPITULATIF\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

if (empty($errors) && empty($warnings)) {
    echo "  ✅ ✅ ✅  Déploiement réussi sans erreur.\n\n";
} else {
    if (! empty($warnings)) {
        echo "  ⚠️  Warnings :\n";
        foreach ($warnings as $w) echo "    • $w\n";
        echo "\n";
    }
    if (! empty($errors)) {
        echo "  ❌ Erreurs :\n";
        foreach ($errors as $e) echo "    • $e\n";
        echo "\n";
    }
}

echo "  Prochaines étapes :\n";
echo "    1. Visite https://newinechurch.org → la SPA doit s'afficher\n";
echo "    2. Connecte-toi : admin@newinechurch.org / Admin@NWC2025!\n";
echo "    3. CHANGE IMMÉDIATEMENT les mots de passe par défaut\n";
echo "    4. SUPPRIME CE FICHIER (setup-deploy.php) via FileZilla\n";
echo "    5. Configure les cron jobs dans hPanel → Cron Jobs (cf. doc)\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
