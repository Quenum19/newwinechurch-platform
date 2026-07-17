<?php

use App\Http\Controllers\Public\SitemapController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Routes web (non-API).
 * - Sitemap.xml dynamique pour SEO
 * - robots.txt
 * - /storage/{path} (fallback hébergement mutualisé sans symlink)
 *
 * Le frontend SPA est servi par Vite (dev) ou un serveur statique (prod).
 * En production, configurer nginx pour servir tout `/` autre que ces routes
 * vers `frontend/dist/index.html`.
 */

// SEO
Route::get('/sitemap.xml', SitemapController::class);

/**
 * NB : la route /storage/{path} a été supprimée — sur Hostinger on configure
 * FILESYSTEM_PUBLIC_ROOT en .env pour pointer le disque public directement
 * vers public_html/api/storage/. Apache sert alors les fichiers sans passer
 * par PHP (perfs natives).
 */

Route::get('/robots.txt', function () {
    $content = "User-agent: *\n"
             . "Allow: /\n"
             . "Disallow: /api/\n"
             . "Disallow: /admin/\n"
             . "Disallow: /mon-espace/\n"
             . "Disallow: /telescope/\n\n"
             . "Sitemap: ".rtrim(config('app.url'), '/')."/sitemap.xml\n";
    return response($content, 200)->header('Content-Type', 'text/plain');
});

// Page Laravel par défaut (utile en cas d'accès direct au backend en prod).
Route::get('/', function () {
    return redirect(env('FRONTEND_URL', 'http://localhost:5173'));
});
