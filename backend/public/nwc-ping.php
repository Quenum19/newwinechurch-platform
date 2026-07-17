<?php
// Test minimal PHP — DOIT afficher "PONG" si PHP fonctionne du tout
// URL : https://api.newinechurch.org/nwc-ping.php
// Aucune dépendance Laravel, juste PHP brut.

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, no-store');

echo "PONG\n";
echo "PHP version: " . PHP_VERSION . "\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";
echo "Document root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'n/a') . "\n";
echo "Script path: " . __FILE__ . "\n";
echo "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'n/a') . "\n";
echo "Backend dir exists: " . (is_dir(__DIR__ . '/../../../../nwc_backend') ? 'YES' : 'NO') . "\n";

// Test si on peut écrire dans le storage qu'on a créé
$storage = __DIR__ . '/storage';
echo "Storage dir exists: " . (is_dir($storage) ? 'YES' : 'NO') . "\n";

// Vérif que les caches Laravel sont là (signe que fix-storage.php a tourné)
$bcache = __DIR__ . '/../../../../nwc_backend/bootstrap/cache';
echo "Bootstrap cache exists: " . (is_dir($bcache) ? 'YES' : 'NO') . "\n";
if (is_dir($bcache)) {
    foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php', 'events.php'] as $f) {
        echo "  $f: " . (file_exists("$bcache/$f") ? 'present' : 'absent') . "\n";
    }
}
