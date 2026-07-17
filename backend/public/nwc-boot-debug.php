<?php
/**
 * Boot étape par étape avec output forcé après chaque ligne.
 * Si une étape fatal, on saura exactement où.
 * URL : https://api.newinechurch.org/nwc-boot-debug.php?key=nwc-deploy-2026
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit("Accès refusé.\n");
}

// Boost limites pour boot lourd
@set_time_limit(180);
@ini_set('memory_limit', '512M');

// Output forcé sans buffering
@ini_set('output_buffering', '0');
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level()) ob_end_flush();
ob_implicit_flush(true);

// Capture E_ERROR et autres fatals dans le rapport
register_shutdown_function(function() {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        echo "\n\n❌ FATAL CAUGHT :\n";
        echo "  Type   : " . $err['type'] . "\n";
        echo "  Message: " . $err['message'] . "\n";
        echo "  File   : " . $err['file'] . "\n";
        echo "  Line   : " . $err['line'] . "\n";
    }
});

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache');
echo "═══════════════════════════════════════════════════════════════\n";
echo "  NWC Boot Debug — étape par étape\n";
echo "═══════════════════════════════════════════════════════════════\n\n";
flush();

function step($label, callable $fn) {
    echo "▸ $label ... ";
    flush();
    $t0 = microtime(true);
    try {
        $r = $fn();
        $ms = round((microtime(true) - $t0) * 1000);
        echo "✅ OK ($ms ms)\n";
        flush();
        return $r;
    } catch (Throwable $e) {
        $ms = round((microtime(true) - $t0) * 1000);
        echo "❌ ÉCHEC ($ms ms)\n";
        echo "  Type    : " . get_class($e) . "\n";
        echo "  Message : " . $e->getMessage() . "\n";
        echo "  Where   : " . $e->getFile() . ':' . $e->getLine() . "\n";
        echo "  Trace   :\n" . $e->getTraceAsString() . "\n";
        flush();
        exit;
    }
}

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
echo "Backend path : $backend\n\n";
flush();

step('1. Existence vendor/autoload.php', function() use ($backend) {
    if (! file_exists("$backend/vendor/autoload.php")) throw new Exception('vendor/autoload.php absent');
    return true;
});

step('2. Require vendor/autoload.php', function() use ($backend) {
    require "$backend/vendor/autoload.php";
    return true;
});

step('3. Existence bootstrap/app.php', function() use ($backend) {
    if (! file_exists("$backend/bootstrap/app.php")) throw new Exception('bootstrap/app.php absent');
    return true;
});

$app = step('4. Require bootstrap/app.php (crée Application)', function() use ($backend) {
    return require "$backend/bootstrap/app.php";
});

step('5. Make ConsoleKernel', function() use ($app) {
    return $app->make(\Illuminate\Contracts\Console\Kernel::class);
});

$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);

step('6. Bootstrap Laravel (lourd : env + config + providers)', function() use ($kernel) {
    $kernel->bootstrap();
    return true;
});

step('7. Lecture config filesystems', function() {
    return config('filesystems.disks.public.root');
});

echo "\nDisque public root : " . config('filesystems.disks.public.root') . "\n\n";

step('8. Lecture DB connection', function() {
    return \Illuminate\Support\Facades\DB::connection()->getPdo()->getAttribute(PDO::ATTR_SERVER_VERSION);
});

echo "\n";

step('9. Test simulé /api/sermons', function() use ($app) {
    $req = \Illuminate\Http\Request::create('/api/sermons', 'GET');
    $resp = $app->handle($req);
    if ($resp->getStatusCode() !== 200) {
        throw new Exception("Status {$resp->getStatusCode()}: " . substr($resp->getContent(), 0, 300));
    }
    return strlen($resp->getContent()) . " bytes";
});

step('10. Test simulé /api/donation-methods', function() use ($app) {
    $req = \Illuminate\Http\Request::create('/api/donation-methods', 'GET');
    $resp = $app->handle($req);
    if ($resp->getStatusCode() !== 200) {
        throw new Exception("Status {$resp->getStatusCode()}: " . substr($resp->getContent(), 0, 500));
    }
    return strlen($resp->getContent()) . " bytes";
});

step('11. Test simulé /api/auth-images/random', function() use ($app) {
    $req = \Illuminate\Http\Request::create('/api/auth-images/random', 'GET');
    $resp = $app->handle($req);
    if ($resp->getStatusCode() !== 200) {
        throw new Exception("Status {$resp->getStatusCode()}: " . substr($resp->getContent(), 0, 500));
    }
    return strlen($resp->getContent()) . " bytes";
});

echo "\n✅ Toutes étapes OK\n";
