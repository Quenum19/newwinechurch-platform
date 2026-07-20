<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BalCandidate;
use App\Models\BalVote;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Résultats du vote Roi & Reine — vue admin (classement live).
 *
 * Permet de voir l'évolution du vote pendant qu'il est ouvert (utile
 * pour vérifier l'engagement sans divulguer les résultats à l'écran).
 */
class BalResultsController extends Controller
{
    public function results(Request $request, int $eventId): JsonResponse
    {
        $user = $request->user();
        if (! $user?->can('manage event tickets')) {
            abort(403);
        }

        Event::findOrFail($eventId);

        $candidates = BalCandidate::where('event_id', $eventId)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get(['id', 'role', 'first_name', 'last_name', 'photo_path']);

        // Compte les votes par candidat pour chaque rôle
        $roiVotes = BalVote::where('event_id', $eventId)
            ->whereNotNull('roi_candidate_id')
            ->selectRaw('roi_candidate_id, COUNT(*) as votes')
            ->groupBy('roi_candidate_id')
            ->pluck('votes', 'roi_candidate_id');

        $reineVotes = BalVote::where('event_id', $eventId)
            ->whereNotNull('reine_candidate_id')
            ->selectRaw('reine_candidate_id, COUNT(*) as votes')
            ->groupBy('reine_candidate_id')
            ->pluck('votes', 'reine_candidate_id');

        $roi = $candidates->where('role', 'roi')->map(fn ($c) => [
            'id'         => $c->id,
            'first_name' => $c->first_name,
            'last_name'  => $c->last_name,
            'photo_url'  => $c->photo_path ? asset('storage/' . $c->photo_path) : null,
            'votes'      => (int) ($roiVotes[$c->id] ?? 0),
        ])->sortByDesc('votes')->values();

        $reine = $candidates->where('role', 'reine')->map(fn ($c) => [
            'id'         => $c->id,
            'first_name' => $c->first_name,
            'last_name'  => $c->last_name,
            'photo_url'  => $c->photo_path ? asset('storage/' . $c->photo_path) : null,
            'votes'      => (int) ($reineVotes[$c->id] ?? 0),
        ])->sortByDesc('votes')->values();

        return response()->json([
            'total_votes' => BalVote::where('event_id', $eventId)->count(),
            'roi'         => $roi,
            'reine'       => $reine,
        ]);
    }
}
