<?php
/**
 * NWC Tickets v5 — déploiement Phase 5 billetterie (Séries d'événements).
 *
 * Pré-requis : Phases 1-4 déjà déployées en prod.
 *
 * Actions :
 *  - Vérifie présence fichiers Phase 5
 *  - Joue les 2 migrations (event_series + events.series_id)
 *  - Re-seed CycleDiscipulatSeeder (série démo 4 samedis)
 *  - Reset caches
 *  - Sanity check : GET /api/series
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v5.php?key=nwc-tickets-v5-2026
 * ⚠ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-tickets-v5-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v5 — Phase 5 Séries d'événements (récurrentes)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers ===
echo "▸ Vérification fichiers Phase 5\n";
$req = [
    'database/migrations/2026_07_04_100000_create_event_series_table.php'         => 'Migration event_series',
    'database/migrations/2026_07_04_110000_add_series_id_to_events_table.php'     => 'Migration events.series_id',
    'app/Models/EventSeries.php'                                                  => 'Model EventSeries',
    'app/Services/EventSeriesGenerator.php'                                       => 'Service generator',
    'app/Http/Controllers/Admin/EventSeriesController.php'                        => 'Admin controller',
    'app/Http/Controllers/Public/EventSeriesController.php'                       => 'Public controller',
    'database/seeders/CycleDiscipulatSeeder.php'                                  => 'Seeder démo',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) echo "  ✅ $label\n";
    else { echo "  ❌ $label MANQUE\n"; $missing[] = $rel; }
}
if ($missing) exit("\n⛔ Re-upload manquants.\n");
echo "\n";

// === 2. Caches ===
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// === 3. Migrations ===
echo "▸ Migrations\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 4. Vérif schéma ===
echo "▸ Vérif schéma\n";
echo "  table event_series : " . (\Schema::hasTable('event_series') ? '✅' : '❌') . "\n";
echo "  colonne events.series_id : " . (\Schema::hasColumn('events', 'series_id') ? '✅' : '❌') . "\n";
echo "\n";

// === 5. Seeder démo (optionnel — en prod admin créera ses propres séries) ===
echo "▸ Seeder démo (optionnel)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\CycleDiscipulatSeeder',
        '--force' => true,
    ]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ⚠ " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Re-cache ===
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "✅ Caches reconstruits.\n\n";

// === 7. Sanity check API ===
echo "▸ Sanity check : GET /api/series\n";
try {
    $req = \Illuminate\Http\Request::create('/api/series', 'GET');
    $resp = $app->handle($req);
    $body = json_decode($resp->getContent(), true);
    echo "  Status: " . $resp->getStatusCode() . " ✅\n";
    echo "  Séries renvoyées : " . count($body['data'] ?? []) . "\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 5 Séries déployée.\n";
echo "  → Admin   : /admin/series (CRUD + génération auto + ajout manuel)\n";
echo "  → Public  : /billetterie/serie/{slug} (toutes les dates d'une série)\n";
echo "  → Listing : /billetterie (cards séries en haut, events seuls en dessous)\n";
echo "  → Récurrence supportée : hebdomadaire + mensuelle\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
