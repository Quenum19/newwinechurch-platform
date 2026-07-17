<?php
/**
 * NWC Users v1 — clear cache pour activer les nouveaux endpoints :
 *   POST /admin/members/{id}/resend-credentials
 *   POST /admin/members/{id}/toggle-status
 *   POST /admin/members/{id}/avatar
 *   POST /admin/members (store) avec option send_credentials
 *   GET /api/departments/{slug} retourne past_events
 *
 * URL : https://api.newinechurch.org/nwc-users-v1.php?key=nwc-users-v1-2026
 * ⚠️ SUPPRIME après vérification.
 */

const DEPLOY_TOKEN = 'nwc-users-v1-2026';
if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(60);
header('Content-Type: text/plain; charset=utf-8');

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Users v1 — gestion accès super admin\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

$req = [
    'app/Http/Controllers/Admin/MembersController.php'        => 'MembersController (resend/toggle/avatar)',
    'app/Http/Controllers/Public/DepartmentController.php'    => 'Public DeptController (past_events)',
    'app/Http/Requests/Admin/StoreMemberRequest.php'          => 'StoreMember (send_credentials)',
    'app/Http/Requests/Admin/UpdateMemberRequest.php'         => 'UpdateMember (send_credentials)',
];
foreach ($req as $rel => $label) {
    echo file_exists("$backend/$rel") ? "  ✅ $label\n" : "  ❌ $label MANQUE\n";
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

// Vérif queue mail
echo "\n▸ Config mail : " . config('mail.default') . "\n";
echo "▸ Queue : " . config('queue.default') . "\n";
echo "  → Si SMTP non configuré, les emails finissent en queue mais ne partent pas. À vérifier avec /admin/parametres.\n";

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Terminé. SUPPRIME ce fichier.\n";
echo "═══════════════════════════════════════════════════════════════\n";
