<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\BalCandidate;
use App\Models\BalPhoto;
use App\Models\BalScreenState;
use App\Models\BalVote;
use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Endpoint public pour l'écran fullscreen live du Bal.
 *
 * L'écran s'affiche sur un ordi dédié en F11, il poll cet endpoint
 * toutes les 2 secondes pour savoir quelle slide afficher et les
 * stats live (arrivées, votes, dernier arrivé, etc.).
 *
 * Public (pas d'auth) car l'écran n'a pas de session. Rate limit léger.
 */
class BalScreenPublicController extends Controller
{
    /** GET /api/public/events/{id}/bal/state — état complet + stats live. */
    public function state(Request $request, int $eventId): JsonResponse
    {
        $event = Event::find($eventId);
        if (! $event) {
            return response()->json(['message' => 'Event introuvable.'], 404);
        }

        // Cache court (1s) pour éviter surcharge BDD malgré le polling.
        $data = Cache::remember(
            "bal:public-state:{$eventId}",
            1,
            fn () => $this->buildState($event)
        );

        return response()->json($data);
    }

    private function buildState(Event $event): array
    {
        $state = BalScreenState::firstOrCreate(
            ['event_id' => $event->id],
            ['current_slide' => 'default', 'vote_status' => 'closed']
        );

        // Stats arrivées (tickets scannés)
        $arrivees = EventTicket::where('event_id', $event->id)
            ->where('status', 'used')
            ->count();

        $totalIssued = EventTicket::where('event_id', $event->id)
            ->whereIn('status', ['confirmed', 'used'])
            ->count();

        // Dernier arrivé
        $latest = EventTicket::where('event_id', $event->id)
            ->where('status', 'used')
            ->orderByDesc('used_at')
            ->first(['first_name', 'last_name', 'used_at', 'ticket_type_id']);

        $latestArrival = null;
        if ($latest) {
            $latestArrival = [
                'full_name'  => trim(($latest->first_name ?? '') . ' ' . ($latest->last_name ?? '')),
                'arrived_at' => $latest->used_at?->toIso8601String(),
            ];
        }

        // Compteur votes
        $votesCount = BalVote::where('event_id', $event->id)->count();

        // Candidats actifs (pour slide vote)
        $candidates = BalCandidate::where('event_id', $event->id)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get(['id', 'role', 'first_name', 'last_name', 'photo_path'])
            ->map(fn ($c) => [
                'id'         => $c->id,
                'role'       => $c->role,
                'first_name' => $c->first_name,
                'last_name'  => $c->last_name,
                'photo_url'  => $c->photo_path ? asset('storage/' . $c->photo_path) : null,
            ]);

        // Résultats — seulement si mode proclamation
        $results = null;
        if ($state->vote_status === 'proclamation') {
            $results = $this->computeResults($event->id);
        }

        // Photos ambiance visibles — priorité à l'ORIGINAL (path) plutôt que la
        // version TV 16:9 pré-composée qui crop les portraits (tête coupée).
        // Le frontend affiche en object-fit: contain + fond flouté de la même
        // image, donc l'original portrait/paysage rend proprement dans les 2 cas.
        $hasTv = \Schema::hasColumn('bal_photos', 'tv_path');
        $columns = array_filter(['path', 'landscape_path', $hasTv ? 'tv_path' : null]);
        $photos = BalPhoto::where('event_id', $event->id)
            ->where('is_visible', true)
            ->orderBy('display_order')
            ->orderByDesc('id')
            ->limit(30)
            ->get($columns)
            ->map(fn ($p) => asset('storage/' . ($p->path ?? $p->landscape_path ?? ($hasTv ? $p->tv_path : null))))
            ->toArray();

        // QR de vote — injecté dans config pour que VoteSlide puisse afficher
        // le VRAI QR sur l'écran live (au lieu du placeholder).
        $config = $state->config ?? [];
        if (! is_array($config)) $config = json_decode(json_encode($config), true) ?: [];
        $frontendUrl = rtrim(config('app.frontend_url', 'https://newinechurch.org'), '/');
        $voteUrl = $frontendUrl . '/bal/vote/' . $event->id;
        $config['vote_url'] = $voteUrl;
        $config['vote_qr_svg'] = Cache::remember(
            "bal:vote-qr-svg:{$event->id}",
            3600,
            fn () => QrCode::size(400)
                ->margin(1)
                ->format('svg')
                ->color(10, 10, 10)
                ->backgroundColor(245, 230, 200)
                ->generate($voteUrl)
        );

        return [
            'current_slide' => $state->current_slide,
            'config'        => $config,
            'vote_status'   => $state->vote_status,
            'stats' => [
                'arrivees_count' => $arrivees,
                'total_expected' => $totalIssued,
                'latest_arrival' => $latestArrival,
                'votes_count'    => $votesCount,
            ],
            'results'    => $results,
            'candidates' => $candidates,
            'photos'     => $photos,
            'event' => [
                'id'          => $event->id,
                'title'       => $event->title,
                'starts_at'   => $event->starts_at?->toIso8601String(),
                'location'    => $event->location,
                'cover_image' => $this->resolveCoverImageUrl($event->cover_image),
            ],
            'now' => now()->toIso8601String(),
        ];
    }

    /** Calcule le classement final (roi + reine). */
    private function computeResults(int $eventId): array
    {
        // Compte les votes par candidat roi + reine
        $roiVotes = BalVote::where('event_id', $eventId)
            ->whereNotNull('roi_candidate_id')
            ->selectRaw('roi_candidate_id, COUNT(*) as votes')
            ->groupBy('roi_candidate_id')
            ->orderByDesc('votes')
            ->get();

        $reineVotes = BalVote::where('event_id', $eventId)
            ->whereNotNull('reine_candidate_id')
            ->selectRaw('reine_candidate_id, COUNT(*) as votes')
            ->groupBy('reine_candidate_id')
            ->orderByDesc('votes')
            ->get();

        $roiWinner   = $roiVotes->first();
        $reineWinner = $reineVotes->first();

        return [
            'roi'   => $roiWinner ? $this->candidateInfo($roiWinner->roi_candidate_id, $roiWinner->votes) : null,
            'reine' => $reineWinner ? $this->candidateInfo($reineWinner->reine_candidate_id, $reineWinner->votes) : null,
            'total_votes' => BalVote::where('event_id', $eventId)->count(),
        ];
    }

    private function candidateInfo(int $candidateId, int $votes): ?array
    {
        $c = BalCandidate::find($candidateId);
        if (! $c) return null;
        return [
            'id'         => $c->id,
            'first_name' => $c->first_name,
            'last_name'  => $c->last_name,
            'photo_url'  => $c->photo_path ? asset('storage/' . $c->photo_path) : null,
            'votes'      => $votes,
        ];
    }

    /** Résout l'URL de la cover_image : nullable + gère URL absolue OU chemin. */
    private function resolveCoverImageUrl(?string $cover): ?string
    {
        if (! $cover) return null;
        // Déjà URL absolue → renvoie tel quel
        if (str_starts_with($cover, 'http://') || str_starts_with($cover, 'https://')) {
            return $cover;
        }
        // Sinon chemin relatif → préfixe storage/
        return asset('storage/' . ltrim($cover, '/'));
    }
}
