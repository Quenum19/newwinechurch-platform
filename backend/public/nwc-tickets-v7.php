<?php
/**
 * NWC Tickets v7 — déploiement Phase 7 billetterie (API CinetPay).
 *
 * Pré-requis : Phases 1-6 déjà jouées en prod.
 *
 * Actions :
 *  - Vérifie présence fichiers Phase 7
 *  - Joue la migration (events.payment_mode + colonnes gateway_*)
 *  - Reset caches
 *  - Sanity check : driver actif + test stub + diagnostic credentials CinetPay
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v7.php?key=nwc-tickets-v7-2026
 * ⚠ SUPPRIME après vérification.
 *
 * IMPORTANT : driver=stub par défaut. Pour activer CinetPay en prod :
 *   1. Compte marchand sur merchant.cinetpay.com (validation 24-48h)
 *   2. Récupérer api_key + site_id depuis le tableau de bord
 *   3. Tester d'abord avec CINETPAY_MODE=sandbox
 *   4. .env : PAYMENT_DRIVER=cinetpay + CINETPAY_API_KEY=… + CINETPAY_SITE_ID=…
 *   5. Re-run config:cache
 */

const DEPLOY_TOKEN = 'nwc-tickets-v7-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v7 — Phase 7 Paiement automatique (CinetPay)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers ===
echo "▸ Vérification fichiers Phase 7\n";
$req = [
    'database/migrations/2026_07_06_100000_add_payment_mode_to_events_and_gateway_to_tickets.php' => 'Migration',
    'config/payments.php'                                                                          => 'Config payments',
    'app/Services/Payment/Contracts/PaymentGatewayDriver.php'                                      => 'Interface driver',
    'app/Services/Payment/Drivers/CinetPayDriver.php'                                              => 'Driver CinetPay',
    'app/Services/Payment/Drivers/StubDriver.php'                                                  => 'Driver Stub',
    'app/Services/Payment/PaymentGatewayService.php'                                               => 'Service',
    'app/Http/Controllers/Public/PaymentGatewayController.php'                                     => 'Controller webhook',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) echo "  ✅ $label\n";
    else { echo "  ❌ $label MANQUE\n"; $missing[] = $rel; }
}
if ($missing) exit("\n⛔ Re-upload manquants.\n");
echo "\n";

// === 2. Caches Laravel ===
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// === 3. Migration ===
echo "▸ Migration\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 4. Vérif schéma ===
echo "▸ Vérif schéma\n";
echo "  events.payment_mode : " . (\Schema::hasColumn('events', 'payment_mode') ? '✅' : '❌') . "\n";
foreach (['gateway_provider', 'gateway_transaction_id', 'gateway_payload'] as $col) {
    echo "  event_tickets.$col : " . (\Schema::hasColumn('event_tickets', $col) ? '✅' : '❌') . "\n";
}
echo "\n";

// === 5. Config diagnostic ===
echo "▸ Config paiement\n";
$driver = config('payments.default_driver');
echo "  Driver actif : $driver\n";
if ($driver === 'cinetpay') {
    $mode = config('payments.cinetpay.mode');
    $key  = config('payments.cinetpay.api_key');
    $site = config('payments.cinetpay.site_id');
    echo "  Mode CinetPay : $mode " . (in_array($mode, ['sandbox', 'prod']) ? '✅' : '❌') . "\n";
    echo "  api_key configuré : " . ($key ? '✅' : '❌ (manque en .env)') . "\n";
    echo "  site_id configuré : " . ($site ? '✅' : '❌ (manque en .env)') . "\n";
    echo "  notify_url (webhook) : " . config('payments.cinetpay.notify_url') . "\n";
    echo "  ⚠ Vérifie que cette URL est bien accessible HTTPS depuis Internet.\n";
} else {
    echo "  ℹ Driver = stub → URLs simulées, pas d'appel HTTP réel.\n";
    echo "  ℹ Pour activer CinetPay :\n";
    echo "     PAYMENT_DRIVER=cinetpay\n";
    echo "     CINETPAY_MODE=sandbox (ou prod)\n";
    echo "     CINETPAY_API_KEY=xxxxx\n";
    echo "     CINETPAY_SITE_ID=yyyyy\n";
}
echo "\n";

// === 6. Smoke test service ===
echo "▸ Smoke test PaymentGatewayService\n";
try {
    $svc = $app->make(\App\Services\Payment\PaymentGatewayService::class);
    echo "  Service instancié : ✅ (driver=" . $svc->driverName() . ")\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 7. Re-cache ===
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "✅ Caches reconstruits.\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 7 Paiement automatique déployée.\n";
echo "  → 2 endpoints publics :\n";
echo "    POST /api/tickets/order/{orderCode}/initiate-payment\n";
echo "    POST /api/payments/cinetpay/webhook  (no auth, verify via /check)\n";
echo "  → Driver actif : $driver\n";
echo "  → events.payment_mode : declarative (default) | cinetpay\n";
echo "  → Webhook auto-valide les tickets + envoi mail/WhatsApp comme Phase 2-3\n";
echo "  → Coexistence : events 'declarative' restent en mode Phase 2 inchangé.\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
