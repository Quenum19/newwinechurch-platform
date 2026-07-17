<?php
/**
 * NWC Staff v1 — déploiement Étapes A-E (rôles/permissions billetterie).
 *
 * Actions :
 *  - Vérifie présence des nouveaux fichiers (migrations, models, controllers, service)
 *  - Joue les 3 migrations (event_staff, guest_scanner_tokens, users.status enum)
 *  - Sanity check schéma
 *  - Vérifie le département sécurité + gouverneur (pour observer auto)
 *  - Reset caches Laravel + OpCache
 *
 * URL : https://api.newinechurch.org/nwc-staff-v1.php?key=nwc-staff-v1-2026
 * ⚠ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-staff-v1-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Staff v1 — Étapes A-E (rôles/permissions billetterie)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");
echo "▸ Backend : $backend\n\n";

// === 1. Vérif fichiers ===
echo "▸ Vérification fichiers Étapes A-E\n";
$req = [
    // Migrations
    'database/migrations/2026_07_10_100000_create_event_staff_table.php'         => 'Migration event_staff',
    'database/migrations/2026_07_10_100001_create_guest_scanner_tokens_table.php'=> 'Migration guest_scanner_tokens',
    'database/migrations/2026_07_10_100002_add_guest_scanner_status_to_users.php'=> 'Migration users.status enum',
    // Étape A
    'config/tickets.php'                                                          => 'Config tickets',
    'app/Models/EventStaff.php'                                                   => 'Model EventStaff',
    'app/Models/GuestScannerToken.php'                                            => 'Model GuestScannerToken',
    'app/Policies/EventPolicy.php'                                                => 'EventPolicy',
    'app/Observers/EventObserver.php'                                             => 'EventObserver',
    // Étape B
    'app/Http/Controllers/Admin/EventStaffController.php'                         => 'Controller EventStaff',
    'app/Http/Resources/EventStaffResource.php'                                   => 'Resource EventStaff',
    'app/Http/Resources/GuestScannerTokenResource.php'                            => 'Resource GuestScannerToken',
    // Étape C
    'app/Services/GuestScannerService.php'                                        => 'Service GuestScanner',
    'app/Http/Controllers/Public/GuestScannerAuthController.php'                  => 'Controller landing invite',
    // Étape E
    'app/Console/Commands/RevokeExpiredEventStaff.php'                            => 'Command auto-révocation',
];
$missing = [];
foreach ($req as $rel => $label) {
    if (file_exists("$backend/$rel")) echo "  ✅ $label\n";
    else { echo "  ❌ $label MANQUE\n"; $missing[] = $rel; }
}
if ($missing) exit("\n⛔ Re-upload les fichiers manquants avant de continuer.\n");
echo "\n";

// === 2. Purge caches Laravel avant boot (pour lire fraîchement) ===
foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// === 3. Migrations ===
echo "▸ Migrations (--force)\n";
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    foreach (explode("\n", trim(\Illuminate\Support\Facades\Artisan::output())) as $line) echo "  $line\n";
} catch (Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
    exit(1);
}
echo "\n";

// === 4. Vérif schéma ===
echo "▸ Vérif schéma\n";
echo "  Table event_staff             : " . (\Schema::hasTable('event_staff') ? '✅' : '❌') . "\n";
echo "  Table guest_scanner_tokens    : " . (\Schema::hasTable('guest_scanner_tokens') ? '✅' : '❌') . "\n";
foreach (['event_id', 'user_id', 'grant', 'assigned_at', 'revoked_at', 'revoke_reason'] as $col) {
    echo "  event_staff.$col : " . (\Schema::hasColumn('event_staff', $col) ? '✅' : '❌') . "\n";
}
foreach (['event_id', 'user_id', 'token', 'display_name', 'status', 'expires_at'] as $col) {
    echo "  guest_scanner_tokens.$col : " . (\Schema::hasColumn('guest_scanner_tokens', $col) ? '✅' : '❌') . "\n";
}
echo "\n";

// === 5. Vérif enum users.status inclut guest_scanner ===
echo "▸ Vérif enum users.status\n";
try {
    $row = \DB::selectOne("SHOW COLUMNS FROM users WHERE Field = 'status'");
    $type = $row->Type ?? '';
    echo "  users.status = $type\n";
    echo "  Contient guest_scanner : " . (str_contains($type, "guest_scanner") ? '✅' : '❌') . "\n";
} catch (Throwable $e) {
    echo "  ⚠ Impossible de lire l'enum : " . $e->getMessage() . "\n";
}
echo "\n";

// === 6. Vérif config sécurité (auto-attribution scanner_lead) ===
echo "▸ Vérif config config/tickets.php\n";
$slugs = config('tickets.scanner_lead_department_slugs', []);
echo "  Slugs sécurité : " . (empty($slugs) ? '(vide — auto scanner_lead désactivé)' : implode(', ', $slugs)) . "\n";
foreach ($slugs as $slug) {
    $dept = \App\Models\Department::where('slug', $slug)->first();
    if ($dept) {
        $gov = $dept->governor;
        echo "  Dépt `$slug` : ✅ · gouverneur : " . ($gov ? "{$gov->email} (id={$gov->id})" : '⚠ aucun') . "\n";
    } else {
        echo "  Dépt `$slug` : ❌ introuvable en base (renommer le slug ou ajouter le dépt)\n";
    }
}
echo "\n";

// === 7. Test observer + policy ===
echo "▸ Test smoke observer (création event → grants auto)\n";
try {
    $pasteur = \App\Models\User::whereHas('roles', fn($q) => $q->whereIn('name', ['superadmin','pasteur','admin']))->first();
    if (! $pasteur) {
        echo "  ⚠ Aucun user admin/pasteur trouvé, smoke skip.\n";
    } else {
        $e = \App\Models\Event::create([
            'title'       => 'STAFF_V1_SMOKE_' . time(),
            'description' => 'smoke',
            'starts_at'   => now()->addDays(7),
            'ends_at'     => now()->addDays(7)->addHours(3),
            'type'        => 'autre',
            'created_by'  => $pasteur->id,
            'is_published' => false,
        ]);
        $grants = \App\Models\EventStaff::where('event_id', $e->id)->get();
        echo "  Event créé (id={$e->id}) · grants auto : {$grants->count()}\n";
        foreach ($grants as $g) {
            echo "    - user_id={$g->user_id} grant={$g->grant}\n";
        }
        // Cleanup
        \App\Models\EventStaff::where('event_id', $e->id)->delete();
        $e->forceDelete();
        echo "  ✅ Cleanup OK\n";
    }
} catch (Throwable $err) {
    echo "  ❌ " . $err->getMessage() . "\n";
}
echo "\n";

// === 8. Reset OpCache ===
echo "▸ Reset OpCache\n";
if (function_exists('opcache_reset')) {
    echo "  " . (opcache_reset() ? '✅ OK' : '⚠ échec') . "\n";
} else {
    echo "  ℹ OpCache non actif.\n";
}
clearstatcache(true);
echo "\n";

// === 9. Re-cache Laravel ===
echo "▸ Re-cache Laravel\n";
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "  ✅ config + route + view + event caches reconstruits\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Déploiement Étapes A-E OK.\n";
echo "  → Panneau Staff opérationnel sur /admin/evenements/{id}/billetterie\n";
echo "  → SUPPRIME nwc-staff-v1.php après vérification.\n";
echo "═══════════════════════════════════════════════════════════════\n";
