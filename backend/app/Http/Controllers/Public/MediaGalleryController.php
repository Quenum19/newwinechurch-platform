<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaGalleryResource;
use App\Models\Department;
use App\Models\Event;
use App\Models\MediaGallery;
use App\Services\BalPhotoComposer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Endpoint public — galerie photos/vidéos.
 *
 * Filtres :
 *   ?file_type=image|video
 *   ?department={slug}  → médias rattachés directement au département
 *   ?event={slug}       → médias rattachés à un événement précis
 *   ?dept_events=1 + ?department={slug} → médias des événements du département
 */
class MediaGalleryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 24), 100);

        $query = MediaGallery::query()
            ->with(['event:id,title,slug', 'department:id,name,slug'])
            ->where('is_published', true);

        // Tri : aléatoire si ?random=1, sinon par défaut tri par date desc.
        //
        // Bonus : ?prefer_videos=N garantit N vidéos minimum dans la sélection
        // aléatoire (si des vidéos existent en BD). Le but : donner de
        // l'animation à la home en mélangeant images + vidéos plutôt que d'avoir
        // 12 photos d'affilée alors qu'on a des vidéos disponibles.
        if ($request->boolean('random')) {
            $preferVideos = (int) $request->query('prefer_videos', 0);

            if ($preferVideos > 0 && $perPage > $preferVideos) {
                // 1. Pull N vidéos aléatoires parmi celles dispo (peut être < N)
                $videoIds = (clone $query)
                    ->where('file_type', 'video')
                    ->inRandomOrder()
                    ->limit($preferVideos)
                    ->pluck('id');

                // 2. Complète avec d'autres items aléatoires (toutes catégories)
                $otherCount = max(0, $perPage - $videoIds->count());
                $otherIds = $videoIds->isEmpty()
                    ? (clone $query)->inRandomOrder()->limit($otherCount)->pluck('id')
                    : (clone $query)->whereNotIn('id', $videoIds)->inRandomOrder()->limit($otherCount)->pluck('id');

                $mergedIds = $videoIds->merge($otherIds)->shuffle();

                if ($mergedIds->isNotEmpty()) {
                    // Restreint la requête finale à ces IDs avec leur ordre shuffle.
                    $query->whereIn('media_gallery.id', $mergedIds)
                          ->orderByRaw('FIELD(media_gallery.id,'.$mergedIds->implode(',').')');
                } else {
                    $query->inRandomOrder();
                }
            } else {
                $query->inRandomOrder();
            }
        } else {
            $query->latest();
        }

        if ($type = $request->query('file_type')) {
            $query->where('file_type', $type);
        }

        // Filtre par événement (slug). Prioritaire car plus spécifique.
        if ($eventSlug = $request->query('event')) {
            $event = Event::where('slug', $eventSlug)->first();
            if ($event) {
                $query->where('event_id', $event->id);
            } else {
                $query->where('id', 0);
            }
        }
        // Filtre par département (slug).
        elseif ($deptSlug = $request->query('department')) {
            $dept = Department::where('slug', $deptSlug)->first();
            if ($dept) {
                // Mode étendu : inclut les médias des événements liés au département.
                if ($request->boolean('dept_events')) {
                    $eventIds = $dept->events()->pluck('events.id');
                    $query->where(function ($q) use ($dept, $eventIds) {
                        $q->where('department_id', $dept->id)
                          ->orWhereIn('event_id', $eventIds);
                    });
                } else {
                    $query->where('department_id', $dept->id);
                }
            } else {
                $query->where('id', 0);
            }
        }

        return MediaGalleryResource::collection($query->paginate($perPage));
    }

    /**
     * GET /public/media/{id}/download?branded=1
     *
     * Sert le fichier avec Content-Disposition: attachment (contourne le pb
     * cross-origin où l'attribut HTML `download` est ignoré).
     *
     * Si ?branded=1 ET le média :
     *   - est une image
     *   - est rattaché à un event
     *   - un frame overlay TV existe pour cet event (resources/frames/*)
     * alors on applique le composer à la volée (cadre software par-dessus).
     * Sinon on renvoie le fichier brut.
     */
    public function download(Request $request, int $id, BalPhotoComposer $composer): Response
    {
        $media = MediaGallery::where('is_published', true)->findOrFail($id);

        $path = $media->file_path;
        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Fichier introuvable.');
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg');
        $isImage = $media->file_type === 'image' || in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true);
        $shouldBrand = $request->boolean('branded') && $isImage && $media->event_id;

        // Nom de fichier élégant
        $eventSlug = $media->event?->slug ?? 'nwc';
        $suffix = $shouldBrand ? '-brande' : '';
        $filename = 'nwc-' . $eventSlug . '-' . $media->id . $suffix . '.' . ($shouldBrand ? 'jpg' : $ext);

        // Cas 1 : brande à la volée
        if ($shouldBrand) {
            $absolute = Storage::disk('public')->path($path);
            $event = Event::find($media->event_id);
            if ($event) {
                // Détection orientation : portrait → cadre story (1080x1920 avec
                // fond flouté, photo entière visible) ; paysage/carré → tv (1920x1080).
                // Sans ça, une photo portrait subit un cover 16:9 qui coupe visages/pieds.
                $isPortrait = false;
                $dim = @getimagesize($absolute);
                if ($dim && $dim[0] > 0 && $dim[1] > 0) {
                    $isPortrait = $dim[1] > $dim[0];
                }

                $composed = $isPortrait
                    ? $composer->composeStoryPublic($absolute, $event)
                    : $composer->composeTvPublic($absolute, $event);

                if ($composed) {
                    return response($composed, 200, [
                        'Content-Type'        => 'image/jpeg',
                        'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                        'Cache-Control'       => 'public, max-age=3600',
                    ]);
                }
                // Si composer échoue (frame absent), on tombe sur le brut plutôt qu'une 500.
            }
        }

        // Cas 2 : fichier brut avec headers attachment
        return Storage::disk('public')->download($path, $filename, [
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
