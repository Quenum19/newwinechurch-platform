<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\GuestScannerToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Auth publique des scanners externes invités par magic-link — Étape C.
 *
 *  GET  /scanner-invite/{token}         → vérifie et retourne infos event
 *  POST /scanner-invite/{token}/redeem  → échange le token contre un Sanctum token
 *
 * Aucune auth requise pour ces endpoints — le token EST l'auth.
 */
class GuestScannerAuthController extends Controller
{
    /**
     * Vérifie qu'un magic-link est valide et retourne les infos pour la
     * landing page (nom de l'invité, event, expiration).
     * NE consomme PAS le token — juste une vérification.
     */
    public function show(string $token): JsonResponse
    {
        $guest = GuestScannerToken::where('token', $token)->first();

        if (! $guest) {
            return response()->json([
                'valid'   => false,
                'reason'  => 'not_found',
                'message' => 'Ce lien est inconnu ou déjà utilisé une fois de trop.',
            ], 404);
        }

        if ($guest->status === GuestScannerToken::STATUS_REVOKED) {
            return response()->json([
                'valid'   => false,
                'reason'  => 'revoked',
                'message' => 'Cet accès a été révoqué par l\'organisateur.',
            ], 403);
        }

        if ($guest->status === GuestScannerToken::STATUS_SUSPENDED) {
            return response()->json([
                'valid'   => false,
                'reason'  => 'suspended',
                'message' => 'Accès temporairement suspendu par l\'organisateur.',
            ], 403);
        }

        if ($guest->expires_at && $guest->expires_at->isPast()) {
            return response()->json([
                'valid'   => false,
                'reason'  => 'expired',
                'message' => 'Ce lien a expiré. Demande un nouveau lien à l\'organisateur.',
            ], 410);
        }

        $guest->load(['event:id,title,slug,starts_at,location', 'user:id,first_name']);

        return response()->json([
            'valid'        => true,
            'display_name' => $guest->display_name,
            'event' => [
                'id'         => $guest->event->id,
                'title'      => $guest->event->title,
                'slug'       => $guest->event->slug,
                'starts_at'  => $guest->event->starts_at?->toIso8601String(),
                'location'   => $guest->event->location,
            ],
            'expires_at' => $guest->expires_at->toIso8601String(),
        ]);
    }

    /**
     * Échange le magic-link contre un token Sanctum côté client.
     * Le user "invité" est loggué → il peut appeler /admin/tickets/scan
     * avec event_id de son event (l'endpoint scan vérifie le grant scopé).
     */
    public function redeem(Request $request, string $token): JsonResponse
    {
        $guest = GuestScannerToken::with(['user', 'event'])->where('token', $token)->first();

        if (! $guest || ! $guest->isValid()) {
            return response()->json([
                'message' => 'Lien invalide, expiré ou révoqué.',
            ], 403);
        }

        // Sécurité #H1 audit : marque toujours last_used_at + last_ip pour
        // détecter les réutilisations abusives du magic-link (un attaquant qui
        // capte le lien pourrait sinon générer plusieurs tokens Sanctum).
        $guest->update([
            'last_used_at' => now(),
            'last_ip'      => $request->ip(),
        ]);

        // Sécurité #H2 audit : abilities SCOPÉES à cet event précis, pas ['*'].
        // Le guest ne peut PAS appeler d'autres endpoints (PUT /me, /donations
        // etc.) avec ce token. Le check est fait par $user->tokenCan(...) dans
        // les endpoints scan (à ajouter côté EventTicketsController::scan).
        $sanctum = $guest->user->createToken(
            name: "guest-scanner-event-{$guest->event_id}",
            abilities: [
                'scan:event-' . $guest->event_id,
                'view-tickets:event-' . $guest->event_id, // pour la liste read-only
            ],
            expiresAt: $guest->expires_at,
        );

        return response()->json([
            'message' => 'Accès accordé. Redirection vers le scanner.',
            'token'   => $sanctum->plainTextToken,
            'user'    => [
                'id'         => $guest->user->id,
                'first_name' => $guest->user->first_name,
                'email'      => $guest->user->email,
                'roles'      => $guest->user->getRoleNames(),
            ],
            'event' => [
                'id'    => $guest->event->id,
                'title' => $guest->event->title,
                'slug'  => $guest->event->slug,
            ],
        ]);
    }
}
