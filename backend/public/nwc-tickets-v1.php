<?php
/**
 * NWC Tickets v1 — déploiement Phase 1 billetterie.
 *
 * Actions :
 *  - Vérifie présence des fichiers backend nouveaux (services, controllers, mail, etc.)
 *  - Joue les 3 migrations billetterie (events.ticketing_*, event_tickets, event_ticket_waitlist)
 *  - Re-seed RolesAndPermissionsSeeder (nouveau rôle `controleur` + permissions)
 *  - Re-seed AdminUserSeeder (compte contrôleur de démo)
 *  - Re-seed DarkNightEventSeeder (event de test)
 *  - Reset cache Spatie + caches Laravel
 *  - Sanity check : GET /api/tickets/events
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v1.php?key=nwc-tickets-2026
 * ⚠️ SUPPRIME après vérification (sécurité — donne accès à db:seed).
 */

const DEPLOY_TOKEN = 'nwc-tickets-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v1 — Phase 1 Billetterie (events, QR, scan, PDF)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Sur Hostinger : public_html est public/ symlinked → le backend Laravel
// vit dans ../../../../nwc_backend. Adapter si le chemin de déploiement diffère.
$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif présence des nouveaux fichiers ===
echo "▸ Vérification des fichiers requis\n";
$req = [
    // Migrations
    'database/migrations/2026_07_01_100000_add_ticketing_to_events_table.php'         => 'Migration add ticketing → events',
    'database/migrations/2026_07_01_110000_create_event_tickets_table.php'            => 'Migration event_tickets',
    'database/migrations/2026_07_01_120000_create_event_ticket_waitlist_table.php'    => 'Migration event_ticket_waitlist',
    // Models
    'app/Models/EventTicket.php'                                                      => 'Model EventTicket',
    'app/Models/EventTicketWaitlist.php'                                              => 'Model EventTicketWaitlist',
    // Services
    'app/Services/TicketCodeGenerator.php'                                            => 'Service TicketCodeGenerator',
    'app/Services/QrPayloadService.php'                                               => 'Service QrPayloadService',
    'app/Services/TicketIssuer.php'                                                   => 'Service TicketIssuer',
    // Mail + templates
    'app/Mail/TicketIssuedMail.php'                                                   => 'Mail TicketIssuedMail',
    'resources/views/emails/tickets/issued.blade.php'                                 => 'Email template ticket',
    'resources/views/pdfs/ticket.blade.php'                                           => 'PDF template ticket',
    // Controllers
    'app/Http/Controllers/Public/TicketsController.php'                               => 'Public TicketsController',
    'app/Http/Controllers/Admin/EventTicketsController.php'                           => 'Admin EventTicketsController',
    // Requests + Resources
    'app/Http/Requests/Public/RegisterTicketRequest.php'                              => 'Request RegisterTicket',
    'app/Http/Resources/EventTicketResource.php'                                      => 'Resource EventTicket',
    // Export Excel
    'app/Exports/EventTicketsExport.php'                                              => 'Export Excel tickets',
    // Console + seeder
    'app/Console/Commands/SendTicketReminders.php'                                    => 'Cron reminder J-1',
    'database/seeders/DarkNightEventSeeder.php'                                       => 'Seeder event démo',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) {
        echo "  ✅ $label\n";
    } else {
        echo "  ❌ $label MANQUE ($rel)\n";
        $missing[] = $rel;
    }
}
if ($missing) exit("\n⛔ Re-upload les fichiers manquants avant de relancer.\n");
echo "\n";

// === 2. Suppression caches Laravel AVANT boot ===
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// === 3. Vérifier que simplesoftwareio/simple-qrcode est bien installé ===
echo "▸ Vérification dépendances Composer\n";
if (! class_exists(\SimpleSoftwareIO\QrCode\Facades\QrCode::class)) {
    exit("  ❌ simplesoftwareio/simple-qrcode introuvable.\n     Lance : composer require simplesoftwareio/simple-qrcode\n");
}
echo "  ✅ simple-qrcode présent\n";
if (! class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
    exit("  ❌ barryvdh/laravel-dompdf introuvable.\n");
}
echo "  ✅ laravel-dompdf présent\n";
if (extension_loaded('imagick')) {
    echo "  ✅ extension imagick chargée (QR PNG net dans PDF)\n";
} else {
    echo "  ⚠ extension imagick absente → fallback SVG actif (rendu OK mais moins net)\n";
}
echo "\n";

// === 4. Migrations ===
echo "▸ Migrations\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 5. Permissions + rôle controleur ===
echo "▸ Seed RolesAndPermissionsSeeder (rôle controleur, perms 'scan tickets', 'manage event tickets')\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
        '--force' => true,
    ]);
    $has = \DB::table('permissions')->where('name', 'scan tickets')->exists();
    echo "  Permission 'scan tickets' : " . ($has ? '✅' : '❌') . "\n";
    $has2 = \DB::table('permissions')->where('name', 'manage event tickets')->exists();
    echo "  Permission 'manage event tickets' : " . ($has2 ? '✅' : '❌') . "\n";
    $hasRole = \Spatie\Permission\Models\Role::where('name', 'controleur')->exists();
    echo "  Rôle 'controleur' : " . ($hasRole ? '✅' : '❌') . "\n";

    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    echo "  ✅ Cache permissions invalidé\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Compte contrôleur de démo (idempotent) ===
echo "▸ Seed AdminUserSeeder (compte controleur@newinechurch.org)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\AdminUserSeeder',
        '--force' => true,
    ]);
    $exists = \App\Models\User::where('email', 'controleur@newinechurch.org')->exists();
    echo "  Compte controleur@newinechurch.org : " . ($exists ? '✅' : '❌') . "\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 7. Event de démo (optionnel — en prod on peut commenter) ===
echo "▸ Seed DarkNightEventSeeder (event de démo)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\DarkNightEventSeeder',
        '--force' => true,
    ]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 8. Re-cache complet ===
\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('cache:clear');
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "✅ Caches reconstruits.\n\n";

// === 9. Sanity check API publique ===
echo "▸ Sanity check : GET /api/tickets/events\n";
try {
    $req = \Illuminate\Http\Request::create('/api/tickets/events', 'GET');
    $resp = $app->handle($req);
    $status = $resp->getStatusCode();
    echo "  Status HTTP : $status " . ($status === 200 ? '✅' : '❌') . "\n";
    if ($status === 200) {
        $body = json_decode($resp->getContent(), true);
        $count = count($body['data'] ?? []);
        echo "  $count événement(s) ticketé(s) renvoyé(s)\n";
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 1 Billetterie déployée.\n";
echo "  → Public  : /billetterie\n";
echo "  → Public  : /billetterie/a-dark-night-in-elegance (démo)\n";
echo "  → Admin   : /admin/evenements/{id}/billetterie\n";
echo "  → Scanner : /scan (login controleur@newinechurch.org / Controleur@NWC2025!)\n";
echo "  → Cron    : tickets:remind-day-before (J-1 18h, déjà schedulé)\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
