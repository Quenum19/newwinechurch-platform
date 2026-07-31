<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaGalleryResource;
use App\Models\Department;
use App\Models\Event;
use App\Models\MediaDownload;
use App\Models\MediaGallery;
use App\Services\BalPhotoComposer;
use App\Services\GalleryDownloadCache;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Endpoint public — galerie photos/vidéos.
 *
 * === Endpoints ===
 *   GET /media                              — liste paginée (filtres event/dept/type)
 *   GET /media/{id}/download?format=X       — download avec cadre event (attachment)
 *   GET /media/{id}/preview?format=X        — même image mais inline (pour <img src>)
 *   GET /events/{slug}/gallery-zip?format=X — ZIP de toutes les photos de l'event
 *
 * === Formats supportés ===
 *   auto (default)         — story si portrait, tv si paysage
 *   tv        1920×1080    — écran 16:9 / partage général
 *   landscape 1350× 900    — Facebook
 *   square    1080×1080    — Instagram feed
 *   story     1080×1920    — Story IG/TikTok (photo entière + fond flouté)
 *   original               — fichier brut sans cadre
 *
 * === Cache disque ===
 * Les versions brandées sont générées une seule fois puis servies depuis
 * storage/app/public/gallery-cache/{event}/{id}-{format}-{fp}.jpg — permet
 * de tenir la charge sur des events populaires.
 */
class MediaGalleryController extends Controller
{
    private const VALID_FORMATS = ['tv', 'landscape', 'square', 'story', 'original', 'auto'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 24), 100);

        $query = MediaGallery::query()
            // brand_frames indispensable pour que MediaGalleryResource puisse
            // exposer has_brand_frames au frontend (sans ça, toujours false).
            ->with(['event:id,title,slug,brand_frames', 'department:id,name,slug'])
            ->where('is_published', true);

        // Tri : aléatoire si ?random=1, sinon par défaut tri par date desc.
        if ($request->boolean('random')) {
            $preferVideos = (int) $request->query('prefer_videos', 0);

            if ($preferVideos > 0 && $perPage > $preferVideos) {
                $videoIds = (clone $query)
                    ->where('file_type', 'video')
                    ->inRandomOrder()
                    ->limit($preferVideos)
                    ->pluck('id');

                $otherCount = max(0, $perPage - $videoIds->count());
                $otherIds = $videoIds->isEmpty()
                    ? (clone $query)->inRandomOrder()->limit($otherCount)->pluck('id')
                    : (clone $query)->whereNotIn('id', $videoIds)->inRandomOrder()->limit($otherCount)->pluck('id');

                $mergedIds = $videoIds->merge($otherIds)->shuffle();

                if ($mergedIds->isNotEmpty()) {
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

        if ($eventSlug = $request->query('event')) {
            $event = Event::where('slug', $eventSlug)->first();
            if ($event) {
                $query->where('event_id', $event->id);
            } else {
                $query->where('id', 0);
            }
        }
        elseif ($deptSlug = $request->query('department')) {
            $dept = Department::where('slug', $deptSlug)->first();
            if ($dept) {
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
     * Preview brandée (inline, pour <img src>) — pas d'attachment.
     * Cache HTTP 1 an + immutable car le fingerprint change si le source change.
     */
    public function preview(Request $request, int $id, GalleryDownloadCache $cache): Response|StreamedResponse
    {
        return $this->serve($request, $id, $cache, attachment: false);
    }

    /**
     * Download brandé avec Content-Disposition: attachment.
     * Log dans media_downloads pour analytics légères.
     */
    public function download(Request $request, int $id, GalleryDownloadCache $cache): Response|StreamedResponse
    {
        $response = $this->serve($request, $id, $cache, attachment: true);
        // Log après avoir servi pour ne pas ralentir la réponse (best effort).
        $this->logDownload($request, $id);
        return $response;
    }

    /**
     * ZIP toutes les photos d'un event dans le format demandé.
     * Rate-limité serré (via routes/api.php — throttle:3,1) car coûteux.
     */
    public function downloadZip(Request $request, string $slug, GalleryDownloadCache $cache): StreamedResponse
    {
        $event = Event::where('slug', $slug)->firstOrFail();
        $format = $this->normalizeFormat($request->query('format', 'auto'));

        // Injecte l'event pré-chargé sur chaque média pour éviter le SELECT
        // dans la boucle ZIP + pour que $m->event soit dispo dans buildZipResponse.
        $medias = MediaGallery::where('event_id', $event->id)
            ->where('is_published', true)
            ->where('file_type', 'image')
            ->orderBy('id')
            ->limit(300)
            ->get()
            ->each(fn ($m) => $m->setRelation('event', $event));

        if ($medias->isEmpty()) {
            abort(404, 'Aucune photo à télécharger.');
        }

        return $this->buildZipResponse($medias, $format, "nwc-{$event->slug}-photos.zip", $cache);
    }

    /**
     * ZIP d'une sélection arbitraire de photos.
     *
     * GET /api/media/zip?ids=1,2,3&format=auto
     *
     * Cap 50 IDs par requête (URL sinon trop longue + coût compo).
     * Groupe par event pour appliquer le bon cadre à chaque photo — la sélection
     * peut mixer plusieurs events. Rate-limité throttle:3,1.
     */
    public function downloadZipSelection(Request $request, GalleryDownloadCache $cache): StreamedResponse
    {
        $format = $this->normalizeFormat($request->query('format', 'auto'));
        $idsRaw = (string) $request->query('ids', '');
        $ids = collect(explode(',', $idsRaw))
            ->map(fn ($s) => (int) trim($s))
            ->filter(fn ($n) => $n > 0)
            ->unique()
            ->take(50)
            ->values()
            ->all();

        if (empty($ids)) {
            abort(422, 'Aucun média sélectionné.');
        }

        $medias = MediaGallery::whereIn('id', $ids)
            ->where('is_published', true)
            ->where('file_type', 'image')
            ->with('event:id,slug,brand_frames')
            ->orderBy('id')
            ->get();

        if ($medias->isEmpty()) {
            abort(404, 'Aucune photo à télécharger.');
        }

        return $this->buildZipResponse($medias, $format, 'nwc-selection.zip', $cache);
    }

    /**
     * Pipeline commun : compose (via cache) + ajoute au ZIP + stream download.
     * Passe l'event de chaque média au composer pour que le bon cadre s'applique.
     */
    private function buildZipResponse($medias, string $format, string $zipName, GalleryDownloadCache $cache): StreamedResponse
    {
        return response()->streamDownload(function () use ($medias, $format, $cache) {
            $tmp = tempnam(sys_get_temp_dir(), 'nwczip');
            $zip = new \ZipArchive();
            $zip->open($tmp, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

            foreach ($medias as $m) {
                $event = $m->event; // eager-loaded ou null
                $abs = Storage::disk('public')->path($m->file_path);
                if (! is_file($abs)) continue;

                $fmt = $format === 'auto' ? $cache->pickAutoFormat($abs) : $format;

                // Même check anti-fallback qu'en serve() : un event sans
                // brand_frames défini ne doit PAS recevoir le cadre par défaut.
                $hasBrand = $event && is_array($event->brand_frames) && ! empty($event->brand_frames);
                $relPath = ($fmt === 'original' || ! $hasBrand)
                    ? $m->file_path
                    : $cache->ensure($m, $fmt, $event);

                if (! $relPath) continue;
                $absFinal = Storage::disk('public')->path($relPath);
                if (! is_file($absFinal)) continue;

                $ext = pathinfo($absFinal, PATHINFO_EXTENSION) ?: 'jpg';
                $slug = $event?->slug ?: 'nwc';
                $zip->addFile($absFinal, "nwc-{$slug}-{$m->id}-{$fmt}.{$ext}");
            }
            $zip->close();

            readfile($tmp);
            @unlink($tmp);
        }, $zipName, [
            'Content-Type'  => 'application/zip',
            'Cache-Control' => 'no-store',
        ]);
    }

    // ================================================================
    // Internals
    // ================================================================

    private function serve(Request $request, int $id, GalleryDownloadCache $cache, bool $attachment): Response|StreamedResponse
    {
        $media = MediaGallery::where('is_published', true)->findOrFail($id);

        $path = $media->file_path;
        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Fichier introuvable.');
        }

        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg');
        $isImage = $media->file_type === 'image'
                || in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true);

        $format = $this->normalizeFormat($request->query('format', 'auto'));
        // ?branded=0 permet de forcer l'original (pour cas particuliers UI).
        if ($request->query('branded') === '0') $format = 'original';

        // === Vérification "l'event a-t-il vraiment un cadre à appliquer ?" ===
        // Sans ce check, le composer utilisait les frames "dark-night-*" par
        // défaut sur TOUS les events (bug : les photos d'autres events
        // sortaient avec le cadre du Bal). Un event doit avoir été
        // explicitement configuré avec brand_frames pour être brandable.
        $event = $media->event_id ? Event::find($media->event_id) : null;
        $hasBrand = $event && is_array($event->brand_frames) && ! empty($event->brand_frames);
        $shouldBrand = $isImage && $format !== 'original' && $hasBrand;

        $eventSlug = $event?->slug ?? 'nwc';
        $suffix = $shouldBrand ? '-brande' : '';
        $ext2  = $shouldBrand ? 'jpg' : $ext;
        $filename = "nwc-{$eventSlug}-{$media->id}{$suffix}.{$ext2}";

        // === Cas 1 : version brandée depuis le cache disque ===
        if ($shouldBrand) {
            $absolute = Storage::disk('public')->path($path);
            $effectiveFormat = $format === 'auto' ? $cache->pickAutoFormat($absolute) : $format;

            $cachedRel = $cache->ensure($media, $effectiveFormat, $event);
            if ($cachedRel) {
                // Cache HTTP court (1h) car l'URL client ne contient PAS le
                // fingerprint : si on met immutable/1 an et qu'on change
                // l'algo composer, les clients continuent à servir l'ancienne
                // image indéfiniment.
                $dim = @getimagesize($absolute);
                $headers = [
                    'Content-Type'         => 'image/jpeg',
                    'Cache-Control'        => 'public, max-age=3600',
                    // Headers debug — visibles dans DevTools Network pour
                    // diagnostiquer quel format a été choisi et pourquoi.
                    'X-NWC-Format-Picked'  => $effectiveFormat,
                    'X-NWC-Source-Ratio'   => $dim ? number_format($dim[0]/max($dim[1],1), 3) : 'na',
                ];
                if ($attachment) {
                    $headers['Content-Disposition'] = 'attachment; filename="' . $filename . '"';
                } else {
                    $headers['Content-Disposition'] = 'inline';
                }
                return Storage::disk('public')->response($cachedRel, $filename, $headers);
            }
            // fallback → original si composer échoue (frame manquant, image corrompue)
        }

        // === Cas 2 : original ===
        $headers = [
            'Cache-Control' => 'public, max-age=86400',
        ];
        if ($attachment) {
            return Storage::disk('public')->download($path, $filename, $headers);
        }
        return Storage::disk('public')->response($path, $filename, array_merge($headers, [
            'Content-Disposition' => 'inline',
        ]));
    }

    private function normalizeFormat(?string $format): string
    {
        $f = strtolower((string) $format);
        return in_array($f, self::VALID_FORMATS, true) ? $f : 'auto';
    }

    private function logDownload(Request $request, int $mediaId): void
    {
        try {
            $media = MediaGallery::find($mediaId);
            MediaDownload::create([
                'media_id'   => $mediaId,
                'event_id'   => $media?->event_id,
                'format'     => $this->normalizeFormat($request->query('format', 'auto')),
                'ip_hash'    => $request->ip() ? sha1($request->ip()) : null,
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'downloaded_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('MediaDownload log failed', ['err' => $e->getMessage()]);
        }
    }
}
