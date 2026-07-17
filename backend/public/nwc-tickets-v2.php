<?php
/**
 * NWC Tickets v2 — déploiement Phase 2 billetterie payante.
 *
 * Pré-requis : Phase 1 (script nwc-tickets-v1.php) déjà jouée en prod.
 *
 * Actions :
 *  - Vérifie présence des nouveaux fichiers backend Phase 2
 *  - Joue les 2 migrations (event_ticket_types + colonnes payment_*)
 *  - Re-seed RolesAndPermissionsSeeder (permission 'validate ticket payments' → admin-site)
 *  - Re-seed DarkNightEventSeeder (types Standard/VIP/Bénévole pour la démo)
 *  - Reset cache Spatie + caches Laravel
 *  - Sanity check : GET /api/tickets/events/a-dark-night-in-elegance (types exposés)
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v2.php?key=nwc-tickets-v2-2026
 * ⚠ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-tickets-v2-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v2 — Phase 2 Billetterie payante (Mobile Money)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers Phase 2 ===
echo "▸ Vérification des fichiers Phase 2\n";
$req = [
    // Migrations
    'database/migrations/2026_07_02_100000_create_event_ticket_types_table.php'   => 'Migration event_ticket_types',
    'database/migrations/2026_07_02_110000_add_payment_to_event_tickets_table.php'=> 'Migration payment_* sur tickets',
    // Models
    'app/Models/EventTicketType.php'                                              => 'Model EventTicketType',
    // Services
    'app/Services/TicketPaymentService.php'                                       => 'Service TicketPaymentService',
    // Mails
    'app/Mail/OrderConfirmationMail.php'                                          => 'Mail OrderConfirmation',
    'app/Mail/PaymentRefusedMail.php'                                             => 'Mail PaymentRefused',
    'resources/views/emails/tickets/order-confirmation.blade.php'                 => 'Template order-confirmation',
    'resources/views/emails/tickets/payment-refused.blade.php'                    => 'Template payment-refused',
    // Controllers
    'app/Http/Controllers/Admin/EventTicketTypesController.php'                   => 'Admin TicketTypesController',
    // Console
    'app/Console/Commands/ExpirePendingTickets.php'                               => 'Cron expire-pending',
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

// === 3. Migrations Phase 2 ===
echo "▸ Migrations Phase 2\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 4. Vérif schéma ===
echo "▸ Vérification structure DB\n";
$hasTypes = \Schema::hasTable('event_ticket_types');
echo "  table event_ticket_types : " . ($hasTypes ? '✅' : '❌') . "\n";
$hasPaymentStatus = \Schema::hasColumn('event_tickets', 'payment_status');
echo "  colonne event_tickets.payment_status : " . ($hasPaymentStatus ? '✅' : '❌') . "\n";
$hasTypeId = \Schema::hasColumn('event_tickets', 'ticket_type_id');
echo "  colonne event_tickets.ticket_type_id : " . ($hasTypeId ? '✅' : '❌') . "\n";
echo "\n";

// === 5. Permissions ===
echo "▸ Seed RolesAndPermissionsSeeder (perm 'validate ticket payments' → admin-site)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
        '--force' => true,
    ]);
    $has = \DB::table('permissions')->where('name', 'validate ticket payments')->exists();
    echo "  Permission 'validate ticket payments' : " . ($has ? '✅' : '❌') . "\n";

    $role = \Spatie\Permission\Models\Role::where('name', 'admin-site')->first();
    if ($role) {
        $okSite = $role->permissions->contains('name', 'validate ticket payments');
        echo "  admin-site a la permission : " . ($okSite ? '✅' : '❌') . "\n";
    }

    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    echo "  ✅ Cache permissions invalidé\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Seeder Dark Night avec types (idempotent) ===
echo "▸ Seed DarkNightEventSeeder (types Standard/VIP/Bénévole de démo)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\DarkNightEventSeeder',
        '--force' => true,
    ]);
    $event = \App\Models\Event::where('slug', 'a-dark-night-in-elegance')->first();
    if ($event) {
        $typesCount = $event->ticketTypes()->count();
        echo "  Types pour 'A Dark Night in Elegance' : $typesCount\n";
        foreach ($event->ticketTypes as $t) {
            echo "    - {$t->name} : {$t->price_fcfa} FCFA (cap {$t->capacity})\n";
        }
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 7. Re-cache complet ===
\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('cache:clear');
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "✅ Caches reconstruits.\n\n";

// === 8. Sanity check API ===
echo "▸ Sanity check : GET /api/tickets/events/a-dark-night-in-elegance\n";
try {
    $req = \Illuminate\Http\Request::create('/api/tickets/events/a-dark-night-in-elegance', 'GET');
    $resp = $app->handle($req);
    echo "  Status HTTP : " . $resp->getStatusCode() . "\n";
    $body = json_decode($resp->getContent(), true);
    if (isset($body['ticket_types'])) {
        echo "  ✅ " . count($body['ticket_types']) . " types de tickets exposés\n";
        echo "  ✅ has_paid_types : " . (($body['meta']['has_paid_types'] ?? false) ? 'YES' : 'NO') . "\n";
    }
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}

// === 9. Cron Phase 2 ===
echo "\n▸ Cron Phase 2\n";
echo "  Le scheduler doit déjà tourner pour Phase 1. Aucune action requise.\n";
echo "  Vérifier dans routes/console.php :\n";
echo "    - tickets:remind-day-before (J-1 18h)        — Phase 1\n";
echo "    - tickets:expire-pending  (hourly)            — Phase 2 (NEW)\n";

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 2 Billetterie payante déployée.\n";
echo "  → Public  : /billetterie/{slug} (sélecteur types Standard/VIP/Bénévole)\n";
echo "  → Public  : /ma-commande/{orderCode} (paiement Mobile Money)\n";
echo "  → Admin   : /admin/evenements/{id}/billetterie → onglet 'Paiements à valider'\n";
echo "  → Seul le rôle 'admin-site' (+ superadmin) peut valider les paiements.\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
