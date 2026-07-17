<?php
/**
 * Diagnostic département prod — identifie pourquoi ajouter un membre échoue silencieusement.
 *
 * URL : https://api.newinechurch.org/nwc-dept-check.php?key=nwc-deploy-2026&dept=17
 * ⚠️ SUPPRIME APRÈS USAGE.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403); exit('Accès refusé.');
}

header('Content-Type: text/plain; charset=utf-8');
$deptId = (int) ($_GET['dept'] ?? 17);

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Diagnostic département #$deptId\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$dept = \App\Models\Department::find($deptId);
if (! $dept) exit("❌ Département #$deptId introuvable.\n");

echo "Nom            : {$dept->name}\n";
echo "Statut         : {$dept->status}\n";
echo "governor_id    : " . ($dept->governor_id ?? 'null') . "\n";
echo "deleted_at     : " . ($dept->deleted_at ?? 'null') . "\n";
echo "\n";

echo "▸ Schéma table department_user\n";
$cols = \Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM department_user");
foreach ($cols as $c) {
    echo "  - {$c->Field} ({$c->Type})" . ($c->Null === 'NO' ? ' NOT NULL' : '') . ($c->Default ? " default={$c->Default}" : '') . "\n";
}
echo "\n";

echo "▸ Lignes pivot actuelles pour ce dept\n";
$pivot = \Illuminate\Support\Facades\DB::table('department_user')->where('department_id', $deptId)->get();
echo "  Total : " . $pivot->count() . " ligne(s)\n";
foreach ($pivot as $p) {
    echo "  - id={$p->id} user={$p->user_id} role={$p->role} joined={$p->joined_at}\n";
}
echo "\n";

echo "▸ Test d'insertion simulée (rollback immédiat)\n";
try {
    \Illuminate\Support\Facades\DB::beginTransaction();
    $firstUser = \App\Models\User::where('id', '!=', 0)->first();
    if (! $firstUser) {
        echo "  ⚠️  Aucun user en DB\n";
    } else {
        echo "  Test attache user #{$firstUser->id} ({$firstUser->first_name} {$firstUser->name})\n";
        $existed = $dept->members()->where('users.id', $firstUser->id)->exists();
        echo "  Déjà membre ? " . ($existed ? 'OUI' : 'NON') . "\n";
        if (! $existed) {
            $dept->members()->attach($firstUser->id, ['role' => 'member', 'joined_at' => now()->toDateString()]);
            $now = $dept->members()->where('users.id', $firstUser->id)->exists();
            echo "  Après attach : " . ($now ? '✅ OK, présent' : '❌ FANTÔME, absent malgré attach') . "\n";
        }
    }
    \Illuminate\Support\Facades\DB::rollBack();
    echo "  → Rollback effectué (rien sauvé)\n";
} catch (\Throwable $e) {
    \Illuminate\Support\Facades\DB::rollBack();
    echo "  ❌ EXCEPTION : " . $e->getMessage() . "\n";
    echo "  → " . $e->getFile() . ':' . $e->getLine() . "\n";
}
echo "\n";

echo "▸ Test endpoint /admin/departments/$deptId vu de l'intérieur\n";
try {
    $req = \Illuminate\Http\Request::create("/api/admin/departments/$deptId", 'GET');
    // Simule un superadmin
    $sa = \App\Models\User::role('superadmin')->first();
    if ($sa) {
        \Illuminate\Support\Facades\Auth::login($sa);
        $req->setUserResolver(fn () => $sa);
        $resp = $app->handle($req);
        echo "  Status : " . $resp->getStatusCode() . "\n";
        $body = json_decode($resp->getContent(), true);
        $count = count($body['members']['data'] ?? $body['members'] ?? []);
        echo "  Members renvoyés : $count\n";
    } else {
        echo "  ⚠️ Pas de superadmin trouvé pour simuler\n";
    }
} catch (\Throwable $e) {
    echo "  ❌ " . $e->getMessage() . "\n";
}
echo "\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Fin. SUPPRIME ce fichier après usage.\n";
echo "═══════════════════════════════════════════════════════════════\n";
