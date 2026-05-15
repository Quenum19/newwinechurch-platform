<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lit l'en-tête Accept-Language envoyé par le frontend (axios → i18n.language)
 * et règle la locale Laravel en conséquence. Les Models utilisent ensuite
 * `App::getLocale()` pour décider quelle traduction renvoyer.
 *
 * Langues supportées : fr (défaut), en.
 */
class SetLocaleFromHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Accept-Language', 'fr');
        // On regarde juste le préfixe 2 lettres (ex: "en-US,en;q=0.9" → "en").
        $lang = strtolower(substr($header, 0, 2));

        if (in_array($lang, ['fr', 'en'], true)) {
            App::setLocale($lang);
        }

        return $next($request);
    }
}
