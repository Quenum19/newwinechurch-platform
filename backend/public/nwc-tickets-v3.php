<?php
/**
 * NWC Tickets v3 — déploiement Phase 3 billetterie (WhatsApp Meta Cloud API).
 *
 * Pré-requis : Phase 1 (v1) + Phase 2 (v2) déjà jouées en prod.
 *
 * Actions :
 *  - Vérifie présence des fichiers Phase 3 (config, drivers, notifications)
 *  - Joue la migration whatsapp_* sur event_tickets
 *  - Reset cache Spatie + Laravel
 *  - Sanity check : driver actif + envoi LogDriver
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v3.php?key=nwc-tickets-v3-2026
 * ⚠ SUPPRIME après vérification.
 *
 * IMPORTANT : ce script NE configure PAS le driver Meta. Pour activer Meta :
 *   1. Compte Meta Business Manager + WhatsApp Business Account + numéro vérifié
 *   2. Templates "nwc_inscription_confirmation", "nwc_tickets_ready",
 *      "nwc_event_reminder" approuvés côté Meta Business Manager
 *   3. Renseigner dans .env prod :
 *        WHATSAPP_DRIVER=meta
 *        WHATSAPP_ENABLED=true
 *        WHATSAPP_META_PHONE_NUMBER_ID=...
 *        WHATSAPP_META_ACCESS_TOKEN=...
 *        WHATSAPP_META_BUSINESS_ACCOUNT_ID=...
 *   4. Re-run config:cache
 */

const DEPLOY_TOKEN = 'nwc-tickets-v3-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v3 — Phase 3 Billetterie WhatsApp (Meta Cloud API)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers Phase 3 ===
echo "▸ Vérification des fichiers Phase 3\n";
$req = [
    'database/migrations/2026_07_03_100000_add_whatsapp_to_event_tickets_table.php' => 'Migration whatsapp_* sur tickets',
    'config/whatsapp.php'                                                            => 'Config whatsapp.php',
    'app/Services/WhatsApp/Contracts/WhatsAppDriver.php'                            => 'Interface WhatsAppDriver',
    'app/Services/WhatsApp/Drivers/MetaCloudDriver.php'                             => 'Driver MetaCloud',
    'app/Services/WhatsApp/Drivers/LogDriver.php'                                   => 'Driver Log (fallback)',
    'app/Services/WhatsApp/WhatsAppService.php'                                     => 'WhatsAppService',
    'app/Notifications/WhatsApp/InscriptionConfirmationWhatsApp.php'                => 'Notif Inscription',
    'app/Notifications/WhatsApp/TicketsReadyWhatsApp.php'                           => 'Notif TicketsReady',
    'app/Notifications/WhatsApp/EventReminderWhatsApp.php'                          => 'Notif EventReminder',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) echo "  ✅ $label\n";
    else { echo "  ❌ $label MANQUE ($rel)\n"; $missing[] = $rel; }
}
if ($missing) exit("\n⛔ Re-upload les fichiers manquants.\n");
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
echo "▸ Vérification schéma DB\n";
foreach (['whatsapp_opt_in', 'whatsapp_sent_at', 'whatsapp_message_id', 'whatsapp_last_status', 'whatsapp_last_error'] as $col) {
    $has = \Schema::hasColumn('event_tickets', $col);
    echo "  event_tickets.$col : " . ($has ? '✅' : '❌') . "\n";
}
echo "\n";

// === 5. Config WhatsApp ===
echo "▸ Config WhatsApp\n";
$driver  = config('whatsapp.driver');
$enabled = config('whatsapp.enabled');
echo "  Driver actif : $driver\n";
echo "  Killswitch enabled : " . ($enabled ? 'YES' : 'NO') . "\n";
if ($driver === 'meta') {
    $hasPhoneId = (bool) config('whatsapp.meta.phone_number_id');
    $hasToken   = (bool) config('whatsapp.meta.access_token');
    echo "  phone_number_id : " . ($hasPhoneId ? '✅' : '❌ manquant en .env') . "\n";
    echo "  access_token : " . ($hasToken ? '✅' : '❌ manquant en .env') . "\n";
    echo "  Templates configurés :\n";
    foreach (['inscription', 'tickets_ready', 'reminder'] as $key) {
        $n = config("whatsapp.templates.$key.name");
        echo "    - $key → $n\n";
    }
} else {
    echo "  ℹ Driver = log → simule les envois dans laravel.log (aucun WhatsApp réel)\n";
    echo "  ℹ Pour activer la prod, voir le commentaire en tête de ce script.\n";
}
echo "\n";

// === 6. Re-cache ===
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "✅ Caches reconstruits.\n\n";

// === 7. Smoke test envoi via le service ===
echo "▸ Smoke test WhatsAppService\n";
try {
    $svc = $app->make(\App\Services\WhatsApp\WhatsAppService::class);
    $ticket = \App\Models\EventTicket::orderByDesc('id')->first();
    if ($ticket) {
        $ticket->whatsapp_opt_in = true;
        $notif = new \App\Notifications\WhatsApp\InscriptionConfirmationWhatsApp(
            ticket: $ticket, totalFcfa: 0,
        );
        $r = $notif->send($svc);
        echo "  Envoi test : " . ($r['ok'] ? '✅' : '❌') . "\n";
        if (! empty($r['message_id'])) echo "  message_id : " . $r['message_id'] . "\n";
        if (! empty($r['error']))      echo "  error : " . $r['error'] . "\n";
    } else {
        echo "  ⚠ Aucun ticket en DB pour tester. Skip.\n";
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 3 Billetterie WhatsApp déployée.\n";
echo "  → Public : checkbox 'Recevoir aussi sur WhatsApp' à l'inscription (cochée par défaut)\n";
echo "  → 3 notifs : inscription · paiement validé · rappel J-1\n";
echo "  → 1 msg / commande (pas par ticket)\n";
echo "  → Driver actif : $driver\n";
echo "\n  ⚠ Activer Meta Cloud API :\n";
echo "     1. Compte Meta Business + numéro vérifié\n";
echo "     2. 3 templates approuvés (nwc_inscription_confirmation, nwc_tickets_ready, nwc_event_reminder)\n";
echo "     3. .env : WHATSAPP_DRIVER=meta + WHATSAPP_META_PHONE_NUMBER_ID + WHATSAPP_META_ACCESS_TOKEN\n";
echo "     4. Re-run config:cache\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
