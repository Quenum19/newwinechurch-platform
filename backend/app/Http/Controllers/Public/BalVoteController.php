<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\BalCandidate;
use App\Models\BalScreenState;
use App\Models\BalVote;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * Vote public Roi & Reine — page mobile via QR code.
 *
 * Anti-triche : sha256(ip + user_agent + cookie_id) — 1 vote max par
 * appareil / navigateur. Le cookie est set à la première visite.
 *
 * Endpoints :
 *  GET  /api/public/events/{id}/bal/vote  → candidats + statut vote
 *  POST /api/public/events/{id}/bal/vote  → soumet le vote
 */
class BalVoteController extends Controller
{
    /** Retourne les infos nécessaires à la page de vote publique. */
    public function show(Request $request, int $eventId): JsonResponse
    {
        $event = Event::find($eventId);
        if (! $event) {
            return response()->json(['message' => 'Event introuvable.'], 404);
        }

        $state = BalScreenState::firstOrCreate(
            ['event_id' => $eventId],
            ['current_slide' => 'default', 'vote_status' => 'closed']
        );

        $candidates = BalCandidate::where('event_id', $eventId)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $rois = $candidates->where('role', 'roi')->values()->map(fn ($c) => [
            'id'         => $c->id,
            'first_name' => $c->first_name,
            'last_name'  => $c->last_name,
            'photo_url'  => $c->photo_path ? asset('storage/' . $c->photo_path) : null,
        ]);

        $reines = $candidates->where('role', 'reine')->values()->map(fn ($c) => [
            'id'         => $c->id,
            'first_name' => $c->first_name,
            'last_name'  => $c->last_name,
            'photo_url'  => $c->photo_path ? asset('storage/' . $c->photo_path) : null,
        ]);

        return response()->json([
            'event' => [
                'id'       => $event->id,
                'title'    => $event->title,
                'starts_at'=> $event->starts_at?->toIso8601String(),
            ],
            'vote_status'   => $state->vote_status,
            'rois'          => $rois,
            'reines'        => $reines,
        ]);
    }

    /**
     * Enregistre un vote — anti-triche fort via CODE TICKET obligatoire.
     * 1 ticket = 1 vote max (contrainte DB unique), impossible de contourner
     * en vidant cookies/navigant en privé/changeant de tel.
     */
    public function submit(Request $request, int $eventId): JsonResponse
    {
        $event = Event::find($eventId);
        if (! $event) {
            return response()->json(['message' => 'Event introuvable.'], 404);
        }

        // Vérifie que le vote est ouvert
        $state = BalScreenState::firstOrCreate(
            ['event_id' => $eventId],
            ['current_slide' => 'default', 'vote_status' => 'closed']
        );
        if ($state->vote_status !== 'open') {
            return response()->json([
                'message' => 'Le vote est actuellement fermé.',
            ], 422);
        }

        $data = $request->validate([
            'ticket_code' => ['required', 'string', 'min:4', 'max:20'],
            'roi_id'      => ['nullable', 'integer', 'exists:bal_candidates,id'],
            'reine_id'    => ['nullable', 'integer', 'exists:bal_candidates,id'],
        ]);

        // Au moins un vote
        if (! ($data['roi_id'] ?? null) && ! ($data['reine_id'] ?? null)) {
            return response()->json([
                'message' => 'Sélectionne au moins un candidat.',
            ], 422);
        }

        // Normalise le code ticket : uppercase, supprime les tirets/espaces
        // → accepte "NWC-EBXB", "nwc ebxb", "EBXB", etc.
        $rawCode = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $data['ticket_code']));
        // Retire préfixe NWC si présent
        $normalizedCode = preg_replace('/^NWC/', '', $rawCode);

        // Cherche le ticket par short_code (avec ou sans préfixe NWC-)
        $ticket = \App\Models\EventTicket::where('event_id', $eventId)
            ->where(function ($q) use ($rawCode, $normalizedCode) {
                $q->where('short_code', $rawCode)
                  ->orWhere('short_code', $normalizedCode)
                  ->orWhere('short_code', 'NWC-' . $normalizedCode)
                  ->orWhere('short_code', 'NWC' . $normalizedCode);
            })
            ->whereIn('status', ['confirmed', 'used'])
            ->first();

        if (! $ticket) {
            return response()->json([
                'message' => 'Code ticket introuvable. Vérifie le code reçu par email (ex : NWC-EBXB).',
            ], 422);
        }

        // Ce ticket a-t-il déjà voté ?
        $existing = BalVote::where('event_id', $eventId)
            ->where('event_ticket_id', $ticket->id)
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'Ce ticket a déjà servi pour voter. Un ticket = un seul vote.',
                'already_voted' => true,
            ], 422);
        }

        // Vérifie que les candidats appartiennent à cet event + bon rôle
        if (($data['roi_id'] ?? null)) {
            $roi = BalCandidate::find($data['roi_id']);
            if (! $roi || $roi->event_id !== $eventId || $roi->role !== 'roi') {
                return response()->json(['message' => 'Candidat Roi invalide.'], 422);
            }
        }
        if (($data['reine_id'] ?? null)) {
            $reine = BalCandidate::find($data['reine_id']);
            if (! $reine || $reine->event_id !== $eventId || $reine->role !== 'reine') {
                return response()->json(['message' => 'Candidat Reine invalide.'], 422);
            }
        }

        // Enregistre le vote (fingerprint conservé pour audit)
        $fingerprint = $this->computeFingerprint($request);
        BalVote::create([
            'event_id'           => $eventId,
            'event_ticket_id'    => $ticket->id,
            'roi_candidate_id'   => $data['roi_id'] ?? null,
            'reine_candidate_id' => $data['reine_id'] ?? null,
            'voter_fingerprint'  => $fingerprint,
            'ip_address'         => $request->ip(),
            'user_agent'         => (string) $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Merci ' . trim($ticket->first_name . ' ' . $ticket->last_name) . ' ! Ton vote a été enregistré.',
            'success' => true,
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function computeFingerprint(Request $request): string
    {
        $ip     = $request->ip();
        $ua     = substr((string) $request->userAgent(), 0, 200);
        $cookie = $this->getOrCreateCookieId($request);
        return hash('sha256', $ip . '|' . $ua . '|' . $cookie);
    }

    private function getOrCreateCookieId(Request $request): string
    {
        $existing = $request->cookie('nwc_vote_id');
        if ($existing && is_string($existing) && strlen($existing) >= 8) {
            return $existing;
        }
        return (string) Str::uuid();
    }
}
