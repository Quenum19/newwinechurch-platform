<?php

namespace App\Http\Middleware;

use App\Models\Department;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Accès réservé au département Transport (gouverneur + membres).
 *
 * Utilisé pour /gouverneur/transport et sous-routes — cartographie
 * des inscrits event à récupérer.
 *
 * Règles :
 *   - Membre du dept Transport (department_id principal OU pivot department_user)
 *   - Bypass pour superadmin / admin (ils voient tout)
 *   - Sinon 403
 *
 * Injecte $request->transport_department_id pour les controllers.
 */
class TransportAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) abort(401);

        $transport = Department::where('slug', 'transport')->first();
        if (! $transport) {
            abort(500, 'Département Transport introuvable en base.');
        }

        // Bypass superadmin / admin — accès total au système
        $bypass = $user->hasAnyRole(['superadmin', 'admin', 'pasteur']);

        $belongsToTransport = $bypass
            || $user->department_id === $transport->id
            || $user->departments()->where('departments.id', $transport->id)->exists();

        if (! $belongsToTransport) {
            abort(403, 'Accès réservé au département Transport.');
        }

        $request->merge(['transport_department_id' => $transport->id]);
        return $next($request);
    }
}
