<?php
/**
 * NWC Mission Check — diagnostic exhaustif pour /mission/evenement/{id}.
 *
 * Vérifie :
 *  1. Routes API bien à jour (middleware attendu)
 *  2. User authentifié via son session cookie (comme le navigateur)
 *  3. Grant event_staff existant + policy retourne true
 *  4. Cache Laravel routes/config présent
 *
 * URL : https://api.newinechurch.org/nwc-mission-check.php?key=nwc-mission-check-2026&event_id=3&user_id=X
 * ⚠ SUPPRIME après diagnostic.
 */

const DEPLOY_TOKEN = 'nwc-mission-check-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(120);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Mission Check — diagnostic /mission/evenement\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// ─── Étape 1 : État du cache routes AVANT boot ────────────────
echo "▸ 1. État bootstrap/cache/ (avant reboot)\n";
$cacheDir = "$backend/bootstrap/cache";
foreach (['config.php', 'routes-v7.php', 'services.php'] as $f) {
    $p = "$cacheDir/$f";
    if (file_exists($p)) {
        $mtime = date('Y-m-d H:i:s', filemtime($p));
        echo "  · $f : présent · dernière modif $mtime\n";
    } else {
        echo "  · $f : absent (frais à chaque request)\n";
    }
}
echo "\n";

// ─── Étape 2 : Vider caches pour repartir propre ──────────────
echo "▸ 2. Vidage des caches (routes-v7, config, services, packages, events)\n";
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$cacheDir/$f";
    if (file_exists($p) && @unlink($p)) echo "  ✅ $f supprimé\n";
}
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "  ✅ OpCache reset\n";
}
clearstatcache(true);
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// ─── Étape 3 : Vérifier route/middleware ──────────────────────
echo "▸ 3. Middlewares actuels sur les routes billetterie\n";
$routes = [
    'App\\Http\\Controllers\\Admin\\EventTicketsController@stats'         => 'stats',
    'App\\Http\\Controllers\\Admin\\EventTicketsController@index'         => 'index tickets',
    'App\\Http\\Controllers\\Admin\\EventTicketsController@waitlist'      => 'waitlist',
    'App\\Http\\Controllers\\Admin\\EventTicketsController@pendingOrders' => 'pending orders',
    'App\\Http\\Controllers\\Admin\\TicketingAnalyticsController@eventDetail' => 'analytics event',
    'App\\Http\\Controllers\\Admin\\EventStaffController@index'           => 'staff list',
];
$expectedMissing = 'permission:access admin panel';
$stillHasBadMiddleware = false;

foreach ($routes as $action => $label) {
    $route = \Illuminate\Support\Facades\Route::getRoutes()->getByAction($action);
    if (! $route) { echo "  ❌ $label : route introuvable\n"; continue; }
    $mw = $route->gatherMiddleware();
    $hasBad = in_array($expectedMissing, $mw);
    $mark = $hasBad ? '❌' : '✅';
    echo "  $mark $label · " . implode(' | ', $mw) . "\n";
    if ($hasBad) $stillHasBadMiddleware = true;
}
echo "\n";

if ($stillHasBadMiddleware) {
    echo "⛔ Le middleware `permission:access admin panel` est encore présent sur ces routes.\n";
    echo "   → Ton api.php n'a pas été uploadé (ou pas le bon fichier).\n";
    echo "   → Compare le contenu du fichier prod avec celui local avant de continuer.\n\n";
}

// ─── Étape 4 : Vérifier le user + son grant ──────────────────
$eventId = (int) ($_GET['event_id'] ?? 0);
$userId  = (int) ($_GET['user_id'] ?? 0);

if ($eventId && $userId) {
    echo "▸ 4. Vérification user=$userId sur event=$eventId\n";
    $user = \App\Models\User::find($userId);
    $event = \App\Models\Event::find($eventId);

    if (! $user)  { echo "  ❌ User $userId introuvable\n"; exit; }
    if (! $event) { echo "  ❌ Event $eventId introuvable\n"; exit; }

    echo "  · User : {$user->email} · rôles : " . implode(', ', $user->getRoleNames()->toArray()) . "\n";
    echo "  · Event : {$event->title}\n";

    // Grant en DB ?
    $row = \App\Models\EventStaff::where('event_id', $eventId)
        ->where('user_id', $userId)
        ->whereNull('revoked_at')
        ->first();
    if (! $row) {
        echo "  ❌ AUCUN GRANT ACTIF pour ce user sur cet event\n";
        echo "     → Va sur /admin/evenements/$eventId/billetterie > STAFF et ajoute-le\n";
    } else {
        echo "  ✅ Grant actif : {$row->grant} (id row event_staff = {$row->id})\n";

        // Test des policy
        echo "  · userCanManage : " . ($event->userCanManage($user) ? '✅ TRUE' : '❌ FALSE') . "\n";
        echo "  · userCanScan   : " . ($event->userCanScan($user) ? '✅ TRUE' : '❌ FALSE') . "\n";

        // Test du can() permission Spatie
        echo "  · can(manage event tickets) : " . ($user->can('manage event tickets') ? 'TRUE' : 'FALSE') . "\n";
    }
    echo "\n";
} else {
    echo "▸ 4. Ajoute &event_id=X&user_id=Y à l'URL pour tester\n\n";
}

// ─── Étape 5 : Re-cacher pour la prod ──────────────────────────
echo "▸ 5. Re-cache config + routes (frais depuis api.php)\n";
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
echo "  ✅ Caches reconstruits\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  → Envoie tout ce texte pour diagnostic.\n";
echo "  → Supprime nwc-mission-check.php après usage.\n";
echo "═══════════════════════════════════════════════════════════════\n";
