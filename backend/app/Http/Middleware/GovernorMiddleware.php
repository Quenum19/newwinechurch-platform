<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware Governor — vérifie que l'utilisateur authentifié est un gouverneur
 * actif (au moins un mandat ouvert dans department_governors avec ended_at IS NULL).
 *
 * Injecte sur la requête :
 *   - $request->governor_department_id : id du département principal courant
 *   - $request->governor_department_ids : array de tous les dept actifs (multi-mandat)
 *
 * On utilise le flag cache users.is_governor pour un short-circuit O(1) et on
 * confirme par une requête pivot pour récupérer le department_id réel.
 */
class GovernorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Court-circuit : flag cache. Évite un SELECT inutile si le flag est false.
        if (! $user->is_governor) {
            return response()->json([
                'message' => 'Accès réservé aux gouverneurs.',
            ], 403);
        }

        // Récupération des mandats actifs (un user peut avoir plusieurs mandats).
        // On prend le primary courant en premier, sinon le premier mandat ouvert.
        $mandates = DB::table('department_governors')
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->whereNull('deleted_at')
            ->orderByDesc('is_primary')
            ->orderByDesc('appointed_at')
            ->get(['department_id', 'is_primary']);

        if ($mandates->isEmpty()) {
            return response()->json([
                'message' => 'Aucun mandat de gouverneur actif. Contactez un administrateur.',
            ], 403);
        }

        // Injection dans la requête pour les controllers.
        $request->merge([
            'governor_department_id'  => (int) $mandates->first()->department_id,
            'governor_department_ids' => $mandates->pluck('department_id')
                                                  ->map(fn ($id) => (int) $id)
                                                  ->all(),
        ]);

        return $next($request);
    }
}
