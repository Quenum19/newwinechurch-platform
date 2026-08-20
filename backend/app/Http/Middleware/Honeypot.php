<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware anti-bot honeypot — global sur les formulaires publics.
 *
 * Convention : le frontend inclut un champ input invisible (offscreen +
 * aria-hidden + tabindex=-1) nommé "website". Les humains ne le voient jamais.
 * Les bots aveugles remplissent TOUS les champs → détection.
 *
 * Comportement : si le champ 'website' est présent et non-vide :
 *   - Le controller ne reçoit JAMAIS la requête (short-circuited ici)
 *   - Retourne un 201 factice avec message générique de succès
 *   - Log l'événement (ip hashée, user-agent tronqué, route)
 *
 * → Le bot pense avoir réussi et ne redouble pas la tentative.
 *
 * Usage : ->middleware('honeypot') sur la route, ou dans un groupe.
 */
class Honeypot
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! empty($request->input('website'))) {
            Log::info('Honeypot triggered', [
                'ip'    => sha1((string) $request->ip()),
                'ua'    => substr((string) $request->userAgent(), 0, 200),
                'route' => $request->path(),
            ]);
            return response()->json([
                'message' => 'Merci ! Ta demande a bien été enregistrée.',
                'id'      => 0,
                'honeypot'=> true,
            ], 201);
        }
        return $next($request);
    }
}
