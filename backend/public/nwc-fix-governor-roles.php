<?php
/**
 * NWC — Resync des rôles "gouverneur" avec l'état réel des mandats.
 *
 * Logique :
 *   Pour chaque user qui a le rôle Spatie 'gouverneur' OU le flag is_governor=true :
 *     - S'il a au moins 1 mandat actif (ended_at=null) → on garde
 *     - Sinon : retire le rôle Spatie + flag is_governor=false
 *
 *   ET pour chaque mandat actif :
 *     - S'assure que l'user a bien le rôle Spatie 'gouverneur' + flag is_governor=true
 *     - S'assure que user.department_id pointe vers un dept réellement actif
 *
 * URL : https://api.newinechurch.org/nwc-fix-governor-roles.php?key=nwc-deploy-2026
 * ⚠️ SUPPRIME APRÈS USAGE.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';
@set_time_limit(120);

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403); exit('Accès refusé.');
}

header('Content-Type: text/plain; charset=utf-8');

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Resync rôles gouverneur ↔ mandats actifs\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$removed = 0; $added = 0; $unchanged = 0; $dept_pointed = 0;

// === 1. Users qui ont le rôle Spatie 'gouverneur' OU is_governor=true ===
echo "▸ Phase 1 — Nettoyage des users SANS mandat actif qui ont quand même le rôle\n";

$flaggedUsers = \App\Models\User::query()
    ->where(function ($q) {
        $q->where('is_governor', true)
          ->orWhereHas('roles', fn ($q) => $q->where('name', 'gouverneur'));
    })
    ->get();

foreach ($flaggedUsers as $u) {
    $hasActive = \Illuminate\Support\Facades\DB::table('department_governors')
        ->where('user_id', $u->id)
        ->whereNull('ended_at')
        ->exists();

    if ($hasActive) {
        $unchanged++;
        continue;
    }

    // Pas de mandat → on retire
    $actions = [];
    if ($u->is_governor) {
        $u->update(['is_governor' => false]);
        $actions[] = 'flag is_governor=false';
    }
    if ($u->hasRole('gouverneur')) {
        $u->removeRole('gouverneur');
        $actions[] = 'rôle gouverneur retiré';
    }
    if ($u->department_id) {
        // Si plus aucun mandat, on nettoie aussi la rattachement principal
        $u->update(['department_id' => null]);
        $actions[] = 'department_id null';
    }
    if ($actions) {
        echo "  ✅ #{$u->id} {$u->first_name} {$u->name} : " . implode(', ', $actions) . "\n";
        $removed++;
    }
}
echo "  $removed users nettoyés, $unchanged déjà cohérents.\n\n";

// === 2. Mandats actifs sans rôle / flag correspondant ===
echo "▸ Phase 2 — Users AVEC mandat actif mais sans rôle Spatie\n";

$activeMandates = \Illuminate\Support\Facades\DB::table('department_governors')
    ->whereNull('ended_at')
    ->select('user_id', 'department_id')
    ->get()
    ->groupBy('user_id');

foreach ($activeMandates as $userId => $mandates) {
    $u = \App\Models\User::find($userId);
    if (! $u) continue;

    $actions = [];
    if (! $u->hasRole('gouverneur')) {
        $u->assignRole('gouverneur');
        $actions[] = 'rôle gouverneur ajouté';
    }
    if (! $u->is_governor) {
        $u->update(['is_governor' => true]);
        $actions[] = 'flag is_governor=true';
    }
    // department_id pointe vers un dept actif ?
    $principalDeptId = $mandates->first()->department_id;
    if (! $u->department_id ||
        ! $mandates->pluck('department_id')->contains($u->department_id)) {
        $u->update(['department_id' => $principalDeptId]);
        $actions[] = "department_id → #$principalDeptId";
        $dept_pointed++;
    }
    if ($actions) {
        echo "  ✅ #{$u->id} {$u->first_name} {$u->name} : " . implode(', ', $actions) . "\n";
        $added++;
    }
}
echo "  $added users mis à jour, $dept_pointed corrigés sur leur dept principal.\n\n";

// === 3. Sync cache member_count_cache de tous les depts ===
echo "▸ Phase 3 — Recalcul des compteurs membres\n";
$fixed = 0;
\App\Models\Department::chunk(50, function ($depts) use (&$fixed) {
    foreach ($depts as $dept) {
        $real = $dept->members()->count();
        if ((int) $dept->member_count_cache !== $real) {
            $dept->update(['member_count_cache' => $real]);
            $fixed++;
        }
    }
});
echo "  $fixed compteurs ajustés.\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  RÉCAPITULATIF\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "  Rôles retirés (sans mandat)      : $removed\n";
echo "  Rôles ajoutés (avec mandat)      : $added\n";
echo "  Department_id principal corrigé  : $dept_pointed\n";
echo "  Compteurs membres ajustés        : $fixed\n";
echo "  Users déjà cohérents             : $unchanged\n";
echo "\n";
echo "  ⚠️ SUPPRIME ce fichier après usage.\n";
echo "═══════════════════════════════════════════════════════════════\n";
