<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BalPhoto;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Photos d'ambiance du Bal — upload par photographes, affichage écran live.
 *
 * Sécurité : requiert `manage event tickets` OU `scan tickets`
 * (les photographes possèdent typiquement `scan tickets`).
 */
class BalPhotosController extends Controller
{
    /** Vérifie que l'utilisateur peut gérer les photos. */
    private function ensureAuthorized(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }
        $ok = $user->can('manage event tickets') || $user->can('scan tickets');
        if (! $ok) {
            abort(response()->json([
                'message' => "Accès refusé : upload de photos réservé aux photographes ou managers billetterie.",
            ], 403));
        }
    }

    /** GET /admin/events/{id}/bal/photos — liste (incluant celles cachées). */
    public function index(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);
        Event::findOrFail($eventId);

        $photos = BalPhoto::where('event_id', $eventId)
            ->with('uploader:id,name,first_name,last_name')
            ->orderBy('display_order')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($p) => [
                'id'            => $p->id,
                'path'          => $p->path,
                'url'           => asset('storage/' . $p->path),
                'caption'       => $p->caption,
                'display_order' => $p->display_order,
                'is_visible'    => (bool) $p->is_visible,
                'uploader'      => $p->uploader ? [
                    'id'         => $p->uploader->id,
                    'first_name' => $p->uploader->first_name,
                    'last_name'  => $p->uploader->last_name,
                ] : null,
            ]);

        return response()->json(['photos' => $photos]);
    }

    /**
     * POST /admin/events/{id}/bal/photos — upload multi-fichier.
     *
     * Accepte soit "photo" (single), soit "photos[]" (multiple).
     */
    public function store(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);
        Event::findOrFail($eventId);

        // Normalisation : on accepte 'photo' seul ou 'photos[]'.
        $files = $request->file('photos') ?? [];
        if (! is_array($files)) {
            $files = [$files];
        }
        if ($request->hasFile('photo')) {
            $files[] = $request->file('photo');
        }

        $request->validate([
            'photos'   => ['sometimes', 'array'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
            'photo'    => ['sometimes', 'image', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
            'caption'  => ['nullable', 'string', 'max:255'],
        ]);

        if (count($files) === 0) {
            return response()->json([
                'message' => 'Aucune photo fournie.',
            ], 422);
        }

        $caption    = $request->input('caption');
        $uploaderId = $request->user()->id;
        $created    = [];

        foreach ($files as $file) {
            $path  = $file->store('bal-photos', 'public');
            $photo = BalPhoto::create([
                'event_id'      => $eventId,
                'path'          => $path,
                'caption'       => $caption,
                'uploaded_by'   => $uploaderId,
                'display_order' => 0,
                'is_visible'    => true,
            ]);
            $created[] = $photo->fresh();
        }

        return response()->json([
            'message' => count($created).' photo(s) uploadée(s).',
            'photos'  => $created,
        ], 201);
    }

    /** PATCH /admin/events/{id}/bal/photos/{pid}/visibility — bascule visible/caché. */
    public function toggleVisibility(Request $request, int $eventId, int $pid): JsonResponse
    {
        $this->ensureAuthorized($request);

        $photo = BalPhoto::where('event_id', $eventId)->findOrFail($pid);
        $photo->is_visible = ! $photo->is_visible;
        $photo->save();

        return response()->json([
            'message' => $photo->is_visible ? 'Photo affichée.' : 'Photo masquée.',
            'photo'   => $photo->fresh(),
        ]);
    }

    /** DELETE /admin/events/{id}/bal/photos/{pid} — suppression + fichier. */
    public function destroy(Request $request, int $eventId, int $pid): JsonResponse
    {
        $this->ensureAuthorized($request);

        $photo = BalPhoto::where('event_id', $eventId)->findOrFail($pid);

        if ($photo->path && Storage::disk('public')->exists($photo->path)) {
            Storage::disk('public')->delete($photo->path);
        }

        $photo->delete();

        return response()->json(['message' => 'Photo supprimée.']);
    }
}
