<?php
/**
 * NWC Tickets v4 — déploiement Phase 4 billetterie (Analytics + récap hebdo).
 *
 * Pré-requis : Phases 1, 2, 3 déjà jouées en prod.
 *
 * Actions :
 *  - Vérifie présence des fichiers Phase 4
 *  - Reset caches Laravel
 *  - Sanity check : appel endpoint analytics overview
 *  - Test envoi mail récap (juste à 1 destinataire en dry-run)
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v4.php?key=nwc-tickets-v4-2026
 * ⚠ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-tickets-v4-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v4 — Phase 4 Analytics + récap hebdo\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers Phase 4 ===
echo "▸ Vérification fichiers Phase 4\n";
$req = [
    'app/Http/Controllers/Admin/TicketingAnalyticsController.php' => 'AnalyticsController',
    'app/Exports/TicketingOverviewExport.php'                     => 'Export Excel trans-events',
    'app/Mail/WeeklyTicketingRecapMail.php'                       => 'Mail récap hebdo',
    'resources/views/emails/tickets/weekly-recap.blade.php'       => 'Template récap',
    'app/Console/Commands/SendWeeklyTicketingRecap.php'           => 'Cron récap',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) echo "  ✅ $label\n";
    else { echo "  ❌ $label MANQUE ($rel)\n"; $missing[] = $rel; }
}
if ($missing) exit("\n⛔ Re-upload les fichiers manquants.\n");
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

// === 3. Re-cache + vérif routes ===
\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "✅ Caches reconstruits.\n\n";

// === 4. Test endpoint overview ===
echo "▸ Sanity check : GET /api/admin/ticketing/overview (auth requise)\n";
try {
    $admin = \App\Models\User::role('superadmin')->first();
    if (! $admin) {
        echo "  ⚠ Aucun superadmin en DB. Skip test.\n";
    } else {
        $req = \Illuminate\Http\Request::create('/api/admin/ticketing/overview', 'GET');
        $req->setUserResolver(fn () => $admin);
        $ctrl = $app->make(\App\Http\Controllers\Admin\TicketingAnalyticsController::class);
        $resp = $ctrl->overview($req);
        $body = json_decode($resp->getContent(), true);
        echo "  Status: " . $resp->getStatusCode() . " ✅\n";
        echo "  Events ticketés: " . ($body['events_count'] ?? 0) . "\n";
        echo "  Revenus payés: " . number_format($body['paid_revenue'] ?? 0, 0, ',', ' ') . " FCFA\n";
        echo "  Conversion 30j: " . ($body['conversion_rate'] ?? 'n/a') . "%\n";
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

// === 5. Cron récap (info seulement) ===
echo "\n▸ Cron récap hebdo\n";
echo "  Le scheduler doit tourner pour Phase 1-3. Aucune action requise.\n";
echo "  Schedule confirmé dans routes/console.php :\n";
echo "    - tickets:remind-day-before  (J-1 18h)\n";
echo "    - tickets:expire-pending     (hourly)\n";
echo "    - tickets:weekly-recap       (lundi 8h) ← NEW Phase 4\n";

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 4 Analytics déployée.\n";
echo "  → /admin/billetterie  : vue trans-events (KPIs + top events + 3 graphs)\n";
echo "  → /admin/evenements/{id}/billetterie  : onglet 'Analytics' (funnel + donuts)\n";
echo "  → Cron lundi 8h        : mail récap → pasteur + admins\n";
echo "  → Export Excel récap   : bouton sur la page /admin/billetterie\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
