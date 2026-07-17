<?php
/**
 * NWC Reset Tickets — vide proprement les données de test billetterie
 * AVANT le lancement officiel de la vente.
 *
 * ⚠️ NE SUPPRIME PAS les events eux-mêmes (garde le catalogue).
 * Nettoie :
 *  - Tous les tickets émis (event_tickets)
 *  - Toutes les entrées waitlist (event_ticket_waitlist)
 *  - Toutes les notifications database (bell propre)
 *  - Les fichiers PDF générés dans storage/app/tickets et /pdfs
 *  - Les tokens Sanctum "guest-scanner-*" (session invités closes)
 *
 * Usage :
 *   1. Aperçu (sans supprimer) :
 *      https://api.newinechurch.org/nwc-reset-tickets.php?key=nwc-reset-2026
 *
 *   2. Nettoyage réel (demande confirmation explicite) :
 *      https://api.newinechurch.org/nwc-reset-tickets.php?key=nwc-reset-2026&confirm=OUI-JE-CONFIRME
 *
 * ⚠️ SUPPRIME ce fichier après usage.
 */

const DEPLOY_TOKEN = 'nwc-reset-2026';
const CONFIRM_TOKEN = 'OUI-JE-CONFIRME';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

@set_time_limit(180);
header('Content-Type: text/plain; charset=utf-8');

$dryRun = ($_GET['confirm'] ?? '') !== CONFIRM_TOKEN;

echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC — RESET BILLETTERIE PRE-LANCEMENT\n";
echo "  Mode : " . ($dryRun ? '🔍 APERÇU (aucune suppression)' : '🔥 SUPPRESSION EFFECTIVE') . "\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
if (! $backend) exit("❌ nwc_backend introuvable.\n");

require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// ═══ Inventaire avant ═══
echo "▸ 1. Inventaire actuel\n";
$counts = [
    'event_tickets'          => \DB::table('event_tickets')->count(),
    'event_ticket_waitlist'  => \DB::table('event_ticket_waitlist')->count(),
    'event_registrations'    => \DB::table('event_registrations')->count(),
    'notifications'          => \DB::table('notifications')->count(),
    'personal_access_tokens' => \DB::table('personal_access_tokens')
        ->where('name', 'like', 'guest-scanner-event-%')->count(),
    'guest_scanner_tokens'   => \DB::table('guest_scanner_tokens')->count(),
    'users guest_scanner'    => \DB::table('users')->where('status', 'guest_scanner')->count(),
];
foreach ($counts as $label => $count) {
    printf("  · %-30s %d\n", $label, $count);
}
echo "\n";

// ═══ Aperçu fichiers ═══
echo "▸ 2. Fichiers storage\n";
$paths = [
    "$backend/storage/app/tickets"     => 'PDFs tickets',
    "$backend/storage/app/public/tickets" => 'PDFs tickets public',
    "$backend/storage/app/tmp"         => 'Fichiers temp (dompdf)',
];
foreach ($paths as $path => $label) {
    if (is_dir($path)) {
        $files = glob("$path/*") ?: [];
        printf("  · %-30s %d fichiers\n", $label, count($files));
    } else {
        printf("  · %-30s (dossier absent)\n", $label);
    }
}
echo "\n";

if ($dryRun) {
    echo "═══════════════════════════════════════════════════════════════\n";
    echo "  ℹ️  Aperçu terminé. Pour supprimer réellement :\n";
    echo "  → ajoute &confirm=" . CONFIRM_TOKEN . " à l'URL\n";
    echo "═══════════════════════════════════════════════════════════════\n";
    exit;
}

// ═══ Suppression réelle ═══
echo "▸ 3. Suppression\n";

try {
    \DB::transaction(function () use (&$stats) {
        // Ordre important : d'abord les enfants (FK), puis les parents
        $stats['event_tickets']         = \DB::table('event_tickets')->delete();
        $stats['event_ticket_waitlist'] = \DB::table('event_ticket_waitlist')->delete();
        $stats['event_registrations']   = \DB::table('event_registrations')->delete();

        // Notifications database (bell notif)
        $stats['notifications'] = \DB::table('notifications')->delete();

        // Tokens Sanctum des guest scanners
        $stats['sanctum_tokens'] = \DB::table('personal_access_tokens')
            ->where('name', 'like', 'guest-scanner-event-%')
            ->delete();

        // Tokens magic-link
        $stats['guest_scanner_tokens'] = \DB::table('guest_scanner_tokens')->delete();

        // Users guest scanner (créés à la volée, aucune valeur post-launch)
        $stats['users guest_scanner'] = \DB::table('users')
            ->where('status', 'guest_scanner')
            ->delete();

        // event_staff grants attribués — on garde les managers/scanner_leads
        // légitimes (assignés manuellement par toi côté admin) mais on peut
        // révoquer TOUS les scanner externes venant des guests.
        // Note : les scanner_leads auto de la sécurité restent OK.
        // Rien à faire ici (les grants sont maintenant scopés proprement).
    });

    echo "  ✅ Transaction OK\n\n";
    echo "▸ 4. Rapport\n";
    foreach ($stats as $label => $deleted) {
        printf("  · %-30s -%d\n", $label, $deleted);
    }

    // Nettoyage fichiers
    echo "\n▸ 5. Fichiers\n";
    foreach ($paths as $path => $label) {
        if (! is_dir($path)) continue;
        $files = glob("$path/*") ?: [];
        $deleted = 0;
        foreach ($files as $f) {
            if (is_file($f) && @unlink($f)) $deleted++;
        }
        printf("  · %-30s -%d fichiers\n", $label, $deleted);
    }

} catch (\Throwable $e) {
    echo "❌ ERREUR : " . $e->getMessage() . "\n";
    echo "   Fichier : " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "   Aucune modification n'a été persistée (rollback).\n";
    exit(1);
}

// ═══ Reset auto-increment ═══
echo "\n▸ 6. Reset auto-increment (nouveaux tickets partent de 1)\n";
try {
    foreach (['event_tickets', 'event_ticket_waitlist', 'event_registrations', 'notifications', 'guest_scanner_tokens'] as $t) {
        \DB::statement("ALTER TABLE `$t` AUTO_INCREMENT = 1");
        echo "  ✅ $t\n";
    }
} catch (\Throwable $e) {
    echo "  ⚠️ Reset auto-increment échoué (pas critique) : " . $e->getMessage() . "\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  ✅ NETTOYAGE TERMINÉ — LA BILLETTERIE EST PROPRE.\n";
echo "  → Événements catalogue préservés (title, dates, capacity, prix)\n";
echo "  → Prochain achat de ticket sera le n°1\n";
echo "  → SUPPRIME ce fichier de public_html/api/ après usage\n";
echo "═══════════════════════════════════════════════════════════════\n";
