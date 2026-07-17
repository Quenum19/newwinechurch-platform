<?php
/**
 * Reset password admin/pasteur/rh à leurs valeurs seed.
 * URL : https://api.newinechurch.org/nwc-reset-admin.php?key=nwc-deploy-2026
 * ⚠️ SUPPRIME APRÈS USAGE — affiche les passwords en clair.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

header('Content-Type: text/plain; charset=utf-8');

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$users = [
    ['admin@newinechurch.org',   'Admin@NWC2025!'],
    ['pasteur@newinechurch.org', 'Pasteur@NWC2025!'],
    ['rh@newinechurch.org',      'Rh@NWC2025!'],
];

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Reset des passwords admin/pasteur/rh\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

foreach ($users as [$email, $pwd]) {
    $u = \App\Models\User::where('email', $email)->first();
    if (! $u) {
        echo "❌ $email → introuvable en DB\n";
        continue;
    }
    $u->password = \Illuminate\Support\Facades\Hash::make($pwd);
    $u->must_change_password = false;  // au cas où
    $u->email_verified_at = $u->email_verified_at ?? now();
    $u->status = 'active';
    $u->save();
    $roles = $u->roles->pluck('name')->implode(', ');
    echo "✅ $email reset → '$pwd' (rôles: $roles)\n";
}

echo "\n";
echo "Connecte-toi maintenant sur https://newinechurch.org/connexion\n";
echo "→ admin@newinechurch.org / Admin@NWC2025!\n\n";
echo "⚠️ CHANGE ces passwords immédiatement après connexion,\n";
echo "   puis SUPPRIME ce fichier via File Manager.\n";
