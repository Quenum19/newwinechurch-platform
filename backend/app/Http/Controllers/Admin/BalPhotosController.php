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

        // Défensif : vérifie que les colonnes existent (au cas où la migration
        // n'a pas encore été appliquée en prod). Fallback sur path uniquement.
        $hasBranded = \Schema::hasColumn('bal_photos', 'landscape_path');

        $photos = BalPhoto::where('event_id', $eventId)
            ->with('uploader:id,name,first_name,last_name')
            ->orderBy('display_order')
            ->orderByDesc('id')
            ->get()
            ->map(function ($p) use ($hasBranded) {
                $landscapePath = $hasBranded ? ($p->landscape_path ?? null) : null;
                $squarePath    = $hasBranded ? ($p->square_path ?? null) : null;

                return [
                    'id'            => $p->id,
                    'path'          => $p->path,
                    'url'           => $p->path ? asset('storage/' . $p->path) : null,
                    'landscape_url' => $landscapePath ? asset('storage/' . $landscapePath) : null,
                    'square_url'    => $squarePath ? asset('storage/' . $squarePath) : null,
                    'has_branded'   => (bool) $landscapePath,
                    'caption'       => $p->caption,
                    'display_order' => $p->display_order,
                    'is_visible'    => (bool) $p->is_visible,
                    'uploader'      => $p->uploader ? [
                        'id'         => $p->uploader->id,
                        'first_name' => $p->uploader->first_name,
                        'last_name'  => $p->uploader->last_name,
                    ] : null,
                ];
            });

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
        $failed     = 0;

        $event = Event::findOrFail($eventId);
        $hasBrandedCols = \Schema::hasColumn('bal_photos', 'landscape_path');

        foreach ($files as $file) {
            // ÉTAPE 1 (obligatoire) : sauve l'original tel quel — jamais un échec ici
            $originalPath = $file->store('bal-photos', 'public');
            $created_attributes = [
                'event_id'      => $eventId,
                'path'          => $originalPath,
                'caption'       => $caption,
                'uploaded_by'   => $uploaderId,
                'display_order' => 0,
                'is_visible'    => true,
            ];

            // ÉTAPE 2 (optionnelle) : compose branded si migration appliquée
            if ($hasBrandedCols) {
                try {
                    $composer = app(\App\Services\BalPhotoComposer::class);
                    $absOriginal = \Storage::disk('public')->path($originalPath);

                    // Landscape 16:9
                    $landscape = $composer->composeLandscapePublic($absOriginal, $event);
                    if ($landscape) {
                        $landscapePath = 'bal-photos/branded/l_' . uniqid() . '.jpg';
                        \Storage::disk('public')->put($landscapePath, $landscape);
                        $created_attributes['landscape_path'] = $landscapePath;
                    }

                    // Carré 1:1
                    $square = $composer->composeSquarePublic($absOriginal, $event);
                    if ($square) {
                        $squarePath = 'bal-photos/branded/s_' . uniqid() . '.jpg';
                        \Storage::disk('public')->put($squarePath, $square);
                        $created_attributes['square_path'] = $squarePath;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('BalPhoto compose failed', [
                        'event' => $eventId, 'err' => $e->getMessage(),
                    ]);
                    $failed++;
                }
            }

            $photo = BalPhoto::create($created_attributes);
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
