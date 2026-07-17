<?php
/**
 * NWC Bulk v1 — clear cache pour activer les nouveaux endpoints bulk.
 * Pas de migration, juste des routes + nouvelles méthodes contrôleurs.
 *
 * URL : https://api.newinechurch.org/nwc-bulk-v1.php?key=nwc-bulk-v1-2026
 * ⚠️ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-bulk-v1-2026';
if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(60);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Bulk v1 — endpoints bulk multi-modules\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

$req = [
    'app/Http/Controllers/Admin/SermonsController.php'            => 'Sermons (bulk)',
    'app/Http/Controllers/Admin/EventsController.php'             => 'Events (bulk)',
    'app/Http/Controllers/Admin/PostsController.php'              => 'Posts (bulk)',
    'app/Http/Controllers/Admin/TestimonialsController.php'       => 'Testimonials (bulk)',
    'app/Http/Controllers/Admin/MembershipRequestsController.php' => 'MembershipRequests (bulk)',
    'app/Http/Controllers/Admin/NewsletterController.php'         => 'Newsletter (bulk)',
    'app/Http/Controllers/Admin/AdminReportReviewController.php'  => 'Reports (hide drafts)',
];
foreach ($req as $rel => $label) {
    echo file_exists("$backend/$rel") ? "  ✅ $label\n" : "  ❌ MANQUE : $label\n";
}
echo "\n";

foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
    $p = "$backend/bootstrap/cache/$f";
    if (file_exists($p)) { @unlink($p); echo "  ✅ $f supprimé\n"; }
}
echo "\n";

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

\Illuminate\Support\Facades\Artisan::call('config:clear');
\Illuminate\Support\Facades\Artisan::call('route:clear');
\Illuminate\Support\Facades\Artisan::call('cache:clear');
\Illuminate\Support\Facades\Artisan::call('config:cache');
\Illuminate\Support\Facades\Artisan::call('route:cache');
\Illuminate\Support\Facades\Artisan::call('view:cache');
\Illuminate\Support\Facades\Artisan::call('event:cache');
echo "✅ Caches reconstruits.\n";

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé. SUPPRIME ce fichier.\n";
echo "═══════════════════════════════════════════════════════════════\n";
