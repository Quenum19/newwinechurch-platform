<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Event;
use App\Models\Post;
use App\Models\Sermon;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Sitemap.xml dynamique pour le SEO.
 * Cache 1h pour limiter la charge BDD.
 *
 * URL : GET / sitemap.xml (route web).
 */
class SitemapController extends Controller
{
    public function __invoke(): Response
    {
        $xml = Cache::remember('sitemap.xml', 3600, function () {
            return $this->build();
        });

        return response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=utf-8');
    }

    private function build(): string
    {
        $base = rtrim(config('app.url'), '/');

        // URLs statiques principales (priorité haute).
        $urls = [
            ['loc' => $base.'/',           'priority' => '1.0', 'changefreq' => 'daily'],
            ['loc' => $base.'/messages',   'priority' => '0.9', 'changefreq' => 'weekly'],
            ['loc' => $base.'/evenements', 'priority' => '0.9', 'changefreq' => 'weekly'],
            ['loc' => $base.'/blog',       'priority' => '0.8', 'changefreq' => 'weekly'],
            ['loc' => $base.'/communaute', 'priority' => '0.7', 'changefreq' => 'monthly'],
            ['loc' => $base.'/donner',     'priority' => '0.7', 'changefreq' => 'monthly'],
            ['loc' => $base.'/contact',    'priority' => '0.6', 'changefreq' => 'monthly'],
        ];

        // Sermons publiés.
        Sermon::published()->select('slug', 'updated_at')->orderByDesc('updated_at')->limit(2000)
            ->get()
            ->each(function ($s) use (&$urls, $base) {
                $urls[] = [
                    'loc'        => $base.'/messages/'.$s->slug,
                    'lastmod'    => $s->updated_at?->toAtomString(),
                    'priority'   => '0.7',
                    'changefreq' => 'monthly',
                ];
            });

        // Articles publiés.
        Post::published()->select('slug', 'updated_at')->orderByDesc('updated_at')->limit(2000)
            ->get()
            ->each(function ($p) use (&$urls, $base) {
                $urls[] = [
                    'loc'        => $base.'/blog/'.$p->slug,
                    'lastmod'    => $p->updated_at?->toAtomString(),
                    'priority'   => '0.6',
                    'changefreq' => 'monthly',
                ];
            });

        // Événements publiés à venir + récents.
        Event::where('is_published', true)->select('slug', 'updated_at')->orderByDesc('updated_at')->limit(2000)
            ->get()
            ->each(function ($e) use (&$urls, $base) {
                $urls[] = [
                    'loc'        => $base.'/evenements/'.$e->slug,
                    'lastmod'    => $e->updated_at?->toAtomString(),
                    'priority'   => '0.6',
                    'changefreq' => 'weekly',
                ];
            });

        // Étape 5 : pages département publiques (actives uniquement).
        Department::active()->select('slug', 'updated_at')->orderBy('sort_order')->limit(500)
            ->get()
            ->each(function ($d) use (&$urls, $base) {
                $urls[] = [
                    'loc'        => $base.'/communaute/'.$d->slug,
                    'lastmod'    => $d->updated_at?->toAtomString(),
                    'priority'   => '0.7',
                    'changefreq' => 'weekly',
                ];
            });

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($urls as $u) {
            $xml .= "  <url>\n";
            $xml .= '    <loc>'.htmlspecialchars($u['loc']).'</loc>'."\n";
            if (! empty($u['lastmod'])) $xml .= '    <lastmod>'.$u['lastmod'].'</lastmod>'."\n";
            $xml .= '    <changefreq>'.$u['changefreq'].'</changefreq>'."\n";
            $xml .= '    <priority>'.$u['priority'].'</priority>'."\n";
            $xml .= "  </url>\n";
        }
        $xml .= '</urlset>'."\n";

        return $xml;
    }
}
