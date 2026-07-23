<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BalScreenState;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Régie de l'écran live du Bal 2026.
 *
 * Toutes les actions modifient (ou créent à la volée) la ligne unique
 * `bal_screen_states` associée à l'event. L'écran fullscreen poll son état.
 *
 * Sécurité : requiert la permission `view attendance` OU `manage event tickets`.
 */
class BalScreenController extends Controller
{
    /** Retourne 403 si l'utilisateur n'a pas les permissions requises. */
    private function ensureAuthorized(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $ok = $user->can('view attendance')
           || $user->can('manage event tickets');

        if (! $ok) {
            abort(response()->json([
                'message' => "Accès refusé : régie du Bal réservée à l'équipe billetterie.",
            ], 403));
        }
    }

    /** Récupère (ou crée) l'état écran pour un event. */
    private function stateFor(int $eventId): BalScreenState
    {
        Event::findOrFail($eventId);

        return BalScreenState::firstOrCreate(
            ['event_id' => $eventId],
            [
                'current_slide' => 'default',
                'config'        => null,
                'vote_status'   => 'closed',
            ]
        );
    }

    /** GET /admin/events/{id}/bal/state — état courant. */
    public function state(int $eventId): JsonResponse
    {
        // Auth via request() car pas d'injection Request ici.
        $this->ensureAuthorized(request());

        $state = $this->stateFor($eventId);

        return response()->json(['state' => $state]);
    }

    /** POST /admin/events/{id}/bal/slide — change la slide affichée. */
    public function setSlide(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);

        $data = $request->validate([
            'slide'  => ['required', 'string', 'max:60'],
            'config' => ['nullable', 'array'],
        ]);

        $state = $this->stateFor($eventId);
        $state->current_slide = $data['slide'];
        $state->config        = $data['config'] ?? null;
        $state->updated_at    = now();
        $state->save();

        return response()->json([
            'message' => 'Slide mise à jour.',
            'state'   => $state->fresh(),
        ]);
    }

    /** POST /admin/events/{id}/bal/vote/open — ouvre le vote. */
    public function openVote(int $eventId): JsonResponse
    {
        $this->ensureAuthorized(request());

        $state = $this->stateFor($eventId);
        $state->vote_status    = 'open';
        $state->vote_opened_at = now();
        $state->vote_closed_at = null;
        $state->updated_at     = now();
        $state->save();

        return response()->json([
            'message' => 'Vote ouvert.',
            'state'   => $state->fresh(),
        ]);
    }

    /** POST /admin/events/{id}/bal/vote/close — clôt le vote. */
    public function closeVote(int $eventId): JsonResponse
    {
        $this->ensureAuthorized(request());

        $state = $this->stateFor($eventId);
        $state->vote_status    = 'closed';
        $state->vote_closed_at = now();
        $state->updated_at     = now();
        $state->save();

        return response()->json([
            'message' => 'Vote clôturé.',
            'state'   => $state->fresh(),
        ]);
    }

    /**
     * POST /admin/events/{id}/bal/upload-media — upload d'un fichier (image OU vidéo)
     * utilisé par les slides live (Dancing Stars, Rappeurs…). Retourne l'URL publique
     * absolue à passer ensuite dans `config` de setSlide.
     *
     * Champ attendu : `file` (multipart/form-data).
     * Formats acceptés : jpg, jpeg, png, webp, gif, mp4, webm, mov, m4v.
     * Taille max : 100 Mo (vidéos possibles).
     */
    public function uploadMedia(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);
        Event::findOrFail($eventId);

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,mp4,webm,mov,m4v',
                'max:102400', // 100 Mo
            ],
        ]);

        $file = $request->file('file');
        $path = $file->store('bal-media', 'public');

        return response()->json([
            'url'  => asset('storage/' . $path),
            'path' => $path,
        ], 201);
    }

    /** POST /admin/events/{id}/bal/proclamer — passe en mode proclamation. */
    public function proclamer(int $eventId): JsonResponse
    {
        $this->ensureAuthorized(request());

        $state = $this->stateFor($eventId);
        $state->vote_status   = 'proclamation';
        $state->current_slide = 'proclamation';
        $state->updated_at    = now();
        $state->save();

        return response()->json([
            'message' => 'Mode proclamation activé.',
            'state'   => $state->fresh(),
        ]);
    }
}
