<?php
/**
 * NWC Staff DEBUG — diagnostic Étape B endpoint /admin/events/{id}/staff.
 *
 * Objectif : identifier POURQUOI l'API retourne 500 quand on ajoute un staff.
 * Fait une simulation d'insertion sans passer par HTTP, affiche l'erreur si elle survient.
 *
 * URL : https://api.newinechurch.org/nwc-staff-debug.php?key=nwc-staff-debug-2026&event_id=3&user_id=X
 * ⚠ SUPPRIME après diagnostic.
 */

const DEPLOY_TOKEN = 'nwc-staff-debug-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Staff DEBUG — diagnostic panneau Staff\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$eventId = (int) ($_GET['event_id'] ?? 0);
$userId  = (int) ($_GET['user_id'] ?? 0);

// === 1. Existence tables ===
echo "▸ 1. Tables\n";
echo "  event_staff          : " . (\Schema::hasTable('event_staff') ? 'OK' : 'ABSENT') . "\n";
echo "  guest_scanner_tokens : " . (\Schema::hasTable('guest_scanner_tokens') ? 'OK' : 'ABSENT') . "\n";
echo "\n";

if (! \Schema::hasTable('event_staff')) {
    echo "⛔ La table event_staff n'existe pas. Migration NON jouée.\n";
    echo "  → Relance nwc-staff-v1.php ?key=nwc-staff-v1-2026\n";
    exit;
}

// === 2. Schéma event_staff ===
echo "▸ 2. Colonnes event_staff\n";
$expected = ['event_id', 'user_id', 'grant', 'assigned_by_id', 'assigned_at', 'revoked_at'];
foreach ($expected as $col) {
    echo "  $col : " . (\Schema::hasColumn('event_staff', $col) ? 'OK' : 'MANQUE') . "\n";
}
echo "\n";

// === 3. Migrations enregistrées ===
echo "▸ 3. Migrations table\n";
$migs = \DB::table('migrations')
    ->where('migration', 'like', '%event_staff%')
    ->orWhere('migration', 'like', '%guest_scanner%')
    ->orWhere('migration', 'like', '%guest_scanner_status%')
    ->pluck('migration');
foreach ($migs as $m) echo "  $m\n";
echo "\n";

// === 4. Event existe ? ===
if ($eventId) {
    echo "▸ 4. Event id=$eventId\n";
    $event = \App\Models\Event::find($eventId);
    echo "  Trouvé : " . ($event ? "OK · titre = {$event->title}" : 'ABSENT') . "\n";
    echo "\n";
} else {
    echo "▸ 4. Event non spécifié (ajoute &event_id=X à l'URL)\n\n";
}

// === 5. User cible existe ? ===
if ($userId) {
    echo "▸ 5. User cible id=$userId\n";
    $user = \App\Models\User::find($userId);
    echo "  Trouvé : " . ($user ? "OK · " . ($user->first_name ?? '') . " " . ($user->name ?? '') . " · {$user->email}" : 'ABSENT') . "\n";
    echo "  avatar_url : " . ($user ? var_export($user->avatar_url, true) : '—') . "\n";
    echo "\n";
} else {
    echo "▸ 5. User cible non spécifié (ajoute &user_id=X à l'URL)\n\n";
}

// === 6. Existe déjà en event_staff ? ===
if ($eventId && $userId) {
    echo "▸ 6. Ligne existante event_staff(event=$eventId, user=$userId)\n";
    $row = \App\Models\EventStaff::where('event_id', $eventId)->where('user_id', $userId)->first();
    if ($row) {
        echo "  Trouvée : grant={$row->grant} · revoked_at=" . ($row->revoked_at ?? '(null)') . "\n";
    } else {
        echo "  Aucune ligne existante — insertion possible\n";
    }
    echo "\n";
}

// === 7. Test insertion réelle (avec rollback) ===
if ($eventId && $userId) {
    echo "▸ 7. Simulation insertion (rollback à la fin)\n";
    try {
        \DB::beginTransaction();
        $test = \App\Models\EventStaff::updateOrCreate(
            ['event_id' => $eventId, 'user_id' => $userId],
            [
                'grant'          => 'manager',
                'assigned_by_id' => $userId, // fallback
                'assigned_at'    => now(),
                'revoked_at'     => null,
                'revoked_by_id'  => null,
                'revoke_reason'  => null,
            ]
        );
        echo "  ✅ Insertion/Update réussie · id={$test->id}\n";

        // Test chargement relations (peut jeter aussi)
        $test->load(['user:id,first_name,name,email,phone,avatar', 'assigner:id,first_name,name']);
        echo "  ✅ Load relations OK · user->name = " . ($test->user?->email ?? '—') . "\n";

        // Test Resource
        $res = new \App\Http\Resources\EventStaffResource($test);
        $arr = $res->toArray(request());
        echo "  ✅ Resource OK · " . count($arr) . " clés\n";

        \DB::rollBack();
        echo "  ↩ Rollback effectué (rien de persistant)\n";
    } catch (\Throwable $e) {
        \DB::rollBack();
        echo "  ❌ EXCEPTION : " . get_class($e) . "\n";
        echo "  Message : " . $e->getMessage() . "\n";
        echo "  Fichier : " . $e->getFile() . ":" . $e->getLine() . "\n";
        echo "\n  Trace (5 premières lignes) :\n";
        foreach (array_slice(explode("\n", $e->getTraceAsString()), 0, 5) as $line) {
            echo "  $line\n";
        }
    }
    echo "\n";
}

// === 8. Dernières lignes storage/logs/laravel.log ===
echo "▸ 8. 15 dernières lignes de laravel.log\n";
$log = "$backend/storage/logs/laravel.log";
if (file_exists($log)) {
    $lines = array_slice(file($log), -15);
    foreach ($lines as $line) echo "  " . rtrim($line) . "\n";
} else {
    echo "  ℹ Fichier log absent (ou vide).\n";
}
echo "\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  → Envoie tout ce qui s'affiche pour diagnostic.\n";
echo "═══════════════════════════════════════════════════════════════\n";
