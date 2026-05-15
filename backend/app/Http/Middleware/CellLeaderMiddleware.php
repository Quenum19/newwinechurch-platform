<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware CellLeader — vérifie que l'utilisateur authentifié est un leader
 * de cellule actif (au moins un mandat dans cell_leaders avec ended_at IS NULL).
 *
 * Injecte sur la requête :
 *   - $request->leader_cell_id : id de la cellule principale courante
 *   - $request->leader_cell_ids : array de toutes les cellules dirigées en cours
 */
class CellLeaderMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Court-circuit : flag cache.
        if (! $user->is_cell_leader) {
            return response()->json([
                'message' => 'Accès réservé aux leaders de cellule.',
            ], 403);
        }

        $mandates = DB::table('cell_leaders')
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->whereNull('deleted_at')
            ->orderByDesc('is_primary')
            ->orderByDesc('appointed_at')
            ->get(['cell_id', 'is_primary']);

        if ($mandates->isEmpty()) {
            return response()->json([
                'message' => 'Aucun mandat de leader de cellule actif. Contactez un administrateur.',
            ], 403);
        }

        $request->merge([
            'leader_cell_id'  => (int) $mandates->first()->cell_id,
            'leader_cell_ids' => $mandates->pluck('cell_id')
                                          ->map(fn ($id) => (int) $id)
                                          ->all(),
        ]);

        return $next($request);
    }
}
