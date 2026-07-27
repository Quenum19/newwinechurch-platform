<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\BalPhoto;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Galerie publique post-événement — GÉNÉRIQUE pour tout event.
 *
 * Même si le modèle sous-jacent s'appelle historiquement BalPhoto (créé pour
 * le bal 2026), l'API est agnostique : tout event ayant au moins une
 * bal_photos.is_visible=true expose une galerie publique.
 *
 * Endpoints :
 *   GET  /public/events/{id}/gallery
 *        → liste des photos visibles de l'event, avec URLs multi-format
 *          (tv 16:9, landscape 3:2, square 1:1, story 9:16, original)
 *   GET  /public/events/{id}/gallery/{photoId}/download?format=tv|landscape|square|story|original
 *        → stream le fichier avec headers force-download (nom élégant
 *          "nwc-{event-slug}-{id}-{format}.jpg")
 */
class EventGalleryController extends Controller
{
    /** GET /public/events/{id}/gallery — index paginé (ou complet si < 200). */
    public function index(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $hasTv     = \Schema::hasColumn('bal_photos', 'tv_path');
        $hasStory  = \Schema::hasColumn('bal_photos', 'story_path');
        $hasBrand  = \Schema::hasColumn('bal_photos', 'landscape_path');

        $photos = BalPhoto::where('event_id', $eventId)
            ->where('is_visible', true)
            ->orderBy('display_order')
            ->orderByDesc('id')
            ->get()
            ->map(function ($p) use ($hasTv, $hasStory, $hasBrand) {
                $tv       = $hasTv    ? $p->tv_path        : null;
                $story    = $hasStory ? $p->story_path     : null;
                $land     = $hasBrand ? $p->landscape_path : null;
                $square   = $hasBrand ? $p->square_path    : null;
                $original = $p->path;

                return [
                    'id'         => $p->id,
                    // URL préférée pour l'aperçu grille (16:9 avec cadre event)
                    'preview_url'   => $tv    ? asset('storage/' . $tv)
                                    : ($land ? asset('storage/' . $land)
                                    : ($original ? asset('storage/' . $original) : null)),
                    // URLs multi-formats pour download
                    'formats'    => array_filter([
                        'tv'        => $tv       ? asset('storage/' . $tv)       : null,
                        'landscape' => $land     ? asset('storage/' . $land)     : null,
                        'square'    => $square   ? asset('storage/' . $square)   : null,
                        'story'     => $story    ? asset('storage/' . $story)    : null,
                        'original'  => $original ? asset('storage/' . $original) : null,
                    ]),
                    'caption'    => $p->caption,
                    'created_at' => $p->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return response()->json([
            'event' => [
                'id'    => $event->id,
                'slug'  => $event->slug,
                'title' => $event->title,
            ],
            'photos' => $photos,
            'count'  => $photos->count(),
        ]);
    }

    /**
     * GET /public/events/{id}/gallery/{photoId}/download?format=tv|landscape|square|story|original
     * Stream le fichier avec headers force-download.
     */
    public function download(Request $request, int $eventId, int $photoId): StreamedResponse|Response
    {
        $event = Event::findOrFail($eventId);
        $photo = BalPhoto::where('event_id', $eventId)
            ->where('id', $photoId)
            ->where('is_visible', true)
            ->firstOrFail();

        $format = strtolower((string) $request->query('format', 'tv'));
        $allowed = ['tv', 'landscape', 'square', 'story', 'original'];
        if (! in_array($format, $allowed, true)) {
            $format = 'tv';
        }

        // Map format → colonne DB
        $col = match ($format) {
            'tv'        => 'tv_path',
            'landscape' => 'landscape_path',
            'square'    => 'square_path',
            'story'     => 'story_path',
            default     => 'path', // original
        };

        // Chaîne de fallback si la colonne demandée est vide (ancien upload)
        $path = $photo->{$col}
             ?? $photo->tv_path
             ?? $photo->landscape_path
             ?? $photo->path;

        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Photo introuvable.');
        }

        $ext = pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg';
        $filename = 'nwc-' . ($event->slug ?: 'event') . '-' . $photo->id . '-' . $format . '.' . $ext;

        return Storage::disk('public')->download($path, $filename, [
            'Content-Type'        => 'image/' . ($ext === 'jpg' ? 'jpeg' : $ext),
            'Cache-Control'       => 'public, max-age=3600',
        ]);
    }
}
