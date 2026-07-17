<?php
/**
 * NWC Tickets v6 — déploiement Phase 6 billetterie (Remboursements + bulk + rôle trésorier).
 *
 * Pré-requis : Phases 1-5 déjà jouées en prod.
 *
 * Actions :
 *  - Vérifie présence fichiers Phase 6
 *  - Joue la migration (ALTER enum + colonnes refund_*)
 *  - Re-seed RolesAndPermissionsSeeder (nouveau rôle tresorier + perm 'refund tickets')
 *  - Reset caches
 *  - Sanity check : récap permissions par rôle
 *
 * URL : https://api.newinechurch.org/nwc-tickets-v6.php?key=nwc-tickets-v6-2026
 * ⚠ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-tickets-v6-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Tickets v6 — Phase 6 Remboursements + bulk + rôle Trésorier\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers ===
echo "▸ Vérification fichiers Phase 6\n";
$req = [
    'database/migrations/2026_07_05_100000_add_refund_to_event_tickets_table.php' => 'Migration refund_*',
    'app/Services/RefundService.php'                                              => 'Service RefundService',
    'app/Mail/TicketRefundedMail.php'                                             => 'Mail TicketRefunded',
    'resources/views/emails/tickets/refunded.blade.php'                           => 'Template refunded',
    'app/Notifications/WhatsApp/TicketRefundedWhatsApp.php'                       => 'WhatsApp notif refund',
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
echo "▸ Migration (ALTER enum + colonnes refund_*)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 4. Vérif schéma ===
echo "▸ Vérif schéma\n";
foreach (['refunded_at', 'refunded_by_id', 'refund_reason', 'refund_method', 'refund_reference', 'refund_amount_fcfa'] as $col) {
    $has = \Schema::hasColumn('event_tickets', $col);
    echo "  event_tickets.$col : " . ($has ? '✅' : '❌') . "\n";
}
// Vérif enum a bien 'refunded'
$enumQuery = \DB::select("SHOW COLUMNS FROM event_tickets WHERE Field = 'payment_status'");
if (! empty($enumQuery)) {
    $type = $enumQuery[0]->Type;
    echo "  enum payment_status contient 'refunded' : " . (str_contains($type, 'refunded') ? '✅' : '❌') . "\n";
}
echo "\n";

// === 5. Re-seed roles + permission ===
echo "▸ Re-seed RolesAndPermissionsSeeder (perm 'refund tickets' + rôle tresorier)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('db:seed', [
        '--class' => 'Database\\Seeders\\RolesAndPermissionsSeeder',
        '--force' => true,
    ]);
    $hasPerm = \DB::table('permissions')->where('name', 'refund tickets')->exists();
    echo "  Permission 'refund tickets' : " . ($hasPerm ? '✅' : '❌') . "\n";
    $hasRole = \Spatie\Permission\Models\Role::where('name', 'tresorier')->exists();
    echo "  Rôle 'tresorier' : " . ($hasRole ? '✅' : '❌') . "\n";

    // Vérif qui a la perm
    foreach (['superadmin', 'pasteur', 'admin-site', 'tresorier'] as $roleName) {
        $role = \Spatie\Permission\Models\Role::where('name', $roleName)->first();
        if (! $role) continue;
        $has = $role->permissions->contains('name', 'refund tickets');
        echo "    $roleName a 'refund tickets' : " . ($has ? '✅' : '❌') . "\n";
    }

    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    echo "  ✅ Cache permissions invalidé\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Re-cache ===
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
echo "✅ Caches reconstruits.\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Phase 6 Remboursements déployée.\n";
echo "  → 3 nouveaux endpoints admin :\n";
echo "    POST /api/admin/tickets/{id}/refund\n";
echo "    POST /api/admin/tickets/orders/{orderCode}/refund\n";
echo "    POST /api/admin/events/{eventId}/cancel-and-refund\n";
echo "  → Permission 'refund tickets' donnée à : superadmin, pasteur, admin-site, tresorier\n";
echo "  → Scan ticket refunded → result='refunded' (rejet propre)\n";
echo "  → Analytics : net_revenue = paid - refunded (nouveau champ overview)\n";
echo "\n  ⚠ SUPPRIME ce fichier après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
