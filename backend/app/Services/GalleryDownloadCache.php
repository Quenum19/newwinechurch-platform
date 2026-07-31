<?php

namespace App\Services;

use App\Models\Event;
use App\Models\MediaGallery;
use Illuminate\Support\Facades\Storage;

/**
 * Cache disque pour les images brandées à la volée.
 *
 * Sans ça, chaque clic download refait tout le pipeline Intervention
 * (decode + cover/blur + insert PNG + encode). Sur GD (Hostinger), une
 * photo 4K portrait avec blur = 3-5 s + CPU 100 %. 50 clics simultanés
 * = serveur mort. Ce cache transforme ces coûts en un one-shot.
 *
 * Emplacement : storage/app/public/gallery-cache/{event_id-or-0}/{mediaId}-{format}-{fp}.jpg
 * (fp = fingerprint 12 chars — dépend du source+frame ; change = invalidation auto)
 *
 * Servi via `storage/gallery-cache/...` (symlink public/storage → storage/app/public).
 */
class GalleryDownloadCache
{
    public function __construct(private BalPhotoComposer $composer) {}

    /**
     * Retourne le chemin storage (public disk) d'une version brandée.
     * Génère et met en cache si absent. Renvoie null en cas d'échec composer.
     */
    public function ensure(MediaGallery $media, string $format, ?Event $event): ?string
    {
        $sourceRel = $media->file_path;
        if (! $sourceRel || ! Storage::disk('public')->exists($sourceRel)) return null;

        $sourceAbs  = Storage::disk('public')->path($sourceRel);
        $fingerprint = $this->composer->cacheFingerprint($sourceAbs, $format, $event);
        $eventPart   = $event?->id ?: 0;
        $cacheRel    = "gallery-cache/{$eventPart}/{$media->id}-{$format}-{$fingerprint}.jpg";

        if (Storage::disk('public')->exists($cacheRel)) {
            return $cacheRel;
        }

        $composed = $this->composer->composeFormat($sourceAbs, $format, $event);
        if (! $composed) return null;

        Storage::disk('public')->put($cacheRel, $composed, ['visibility' => 'public']);
        return $cacheRel;
    }

    /**
     * Détermine le format "auto" selon l'orientation ET le ratio de la photo :
     *   - portrait (h > w)              → story    (1080×1920 blur-bg)
     *   - carré (ratio ≈ 1)             → square   (1080×1080)
     *   - paysage large (ratio ≥ 1.7)   → tv       (1920×1080, ~16:9)
     *   - paysage classique (autre)     → landscape (1350×900, 3:2, moins
     *                                   de perte sur les photos 4:3 courantes)
     *
     * Le composer bascule ensuite en blur-bg si le ratio source vs cible
     * diffère trop (cf. BalPhotoComposer::composeFormat).
     */
    public function pickAutoFormat(string $absolutePath): string
    {
        $dim = @getimagesize($absolutePath);
        if (! $dim || $dim[0] <= 0 || $dim[1] <= 0) return 'tv';

        $ratio = $dim[0] / $dim[1];
        if ($ratio < 0.95)  return 'story';    // portrait
        if ($ratio < 1.15)  return 'square';   // ~carré
        if ($ratio >= 1.70) return 'tv';       // large 16:9
        return 'landscape';                    // 4:3 / 3:2 / classique
    }

    /** Vide tous les fichiers cache d'un média donné (à appeler sur delete). */
    public function forget(MediaGallery $media): void
    {
        $eventPart = $media->event_id ?: 0;
        $dir = "gallery-cache/{$eventPart}";
        if (! Storage::disk('public')->exists($dir)) return;
        foreach (Storage::disk('public')->files($dir) as $f) {
            if (str_contains(basename($f), "{$media->id}-")) {
                Storage::disk('public')->delete($f);
            }
        }
    }
}
