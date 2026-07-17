<?php
/**
 * Réparation des member_count_cache désynchronisés (rétroactif).
 * URL : https://api.newinechurch.org/nwc-fix-counters.php?key=nwc-deploy-2026
 * ⚠️ SUPPRIME APRÈS USAGE.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403); exit('Accès refusé.');
}

header('Content-Type: text/plain; charset=utf-8');

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Réparation compteurs membres par département\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$fixed = 0; $unchanged = 0;

\App\Models\Department::chunk(50, function ($depts) use (&$fixed, &$unchanged) {
    foreach ($depts as $dept) {
        $real = $dept->members()->count();
        $cached = (int) $dept->member_count_cache;
        if ($real !== $cached) {
            $dept->update(['member_count_cache' => $real]);
            echo "  ✅ #{$dept->id} {$dept->name} : $cached → $real\n";
            $fixed++;
        } else {
            $unchanged++;
        }
    }
});

echo "\n";
echo "Total : $fixed corrigés, $unchanged déjà OK\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "  Fini. SUPPRIME ce fichier.\n";
echo "═══════════════════════════════════════════════════════════════\n";
