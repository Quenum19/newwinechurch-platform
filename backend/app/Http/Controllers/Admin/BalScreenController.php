<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BalScreenState;
use App\Models\BalVote;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

    /**
     * POST /admin/events/{id}/bal/vote/reset — supprime tous les votes.
     * Utile pour repartir de zéro après les tests / entre 2 événements.
     */
    public function resetVotes(int $eventId): JsonResponse
    {
        $this->ensureAuthorized(request());
        Event::findOrFail($eventId);

        $deleted = BalVote::where('event_id', $eventId)->delete();

        // Purge le cache du state public pour refléter immédiatement 0 votes
        Cache::forget("bal:public-state:{$eventId}");

        return response()->json([
            'message' => "{$deleted} vote(s) supprimé(s). Compteur remis à 0.",
            'deleted' => $deleted,
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
     * POST /admin/events/{id}/bal/kim-b/upload — upload des photos de KIM B
     * ET met à jour le state pour afficher la slide immédiatement (atomique).
     *
     * Accepte 1 à N images (champ `photos[]`), les stocke dans
     * storage/app/public/kim-b/ et retourne les URLs publiques.
     * Écrase les fichiers portant le même nom séquentiel (1.jpg, 2.jpg, …).
     */
    public function uploadKimBPhotos(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);
        Event::findOrFail($eventId);

        $request->validate([
            'photos'   => ['required', 'array', 'min:1', 'max:10'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:20480'], // 20 Mo/photo
        ]);

        // Purge les anciennes photos (évite l'accumulation de fichiers orphelins)
        $existing = Storage::disk('public')->files('kim-b');
        foreach ($existing as $old) {
            Storage::disk('public')->delete($old);
        }

        $urls = [];
        foreach ($request->file('photos') as $i => $file) {
            $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $filename = ($i + 1) . '.' . $ext;
            // storeAs crée le sous-dossier automatiquement (pattern Laravel standard)
            $file->storeAs('kim-b', $filename, 'public');
            $urls[] = asset('storage/kim-b/' . $filename);
        }

        // Met à jour le state atomiquement : slide active + photos en config
        $state = $this->stateFor($eventId);
        $state->current_slide = 'kim-b-photos';
        $state->config        = ['kim_b_photos' => $urls];
        $state->updated_at    = now();
        $state->save();

        return response()->json([
            'photos'  => $urls,
            'state'   => $state->fresh(),
            'message' => count($urls) . ' photo(s) uploadée(s) et slide activée.',
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
