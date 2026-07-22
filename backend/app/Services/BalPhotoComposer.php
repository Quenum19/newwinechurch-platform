<?php

namespace App\Services;

use App\Models\Event;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\ImageManager;

/**
 * Compose les photos ambiance du Bal avec cadre "A Dark Night in Elegance".
 *
 * Chaque format a son PNG overlay pré-généré (Chrome headless depuis le HTML
 * du design) dans backend/resources/frames/ :
 *   - dark-night-tv.png        (1920×1080 — écran live TV, cover full écran)
 *   - dark-night-landscape.png (1350×900  — publications Facebook / partage général)
 *   - dark-night-square.png    (1080×1080 — Instagram feed)
 *   - dark-night-story.png     (1080×1920 — Instagram/TikTok stories)
 *
 * Modes de composition :
 *   - COVER : photo remplit toute la surface (TV, landscape, square)
 *   - BLUR_BG : photo entière visible centrée sur fond flouté d'elle-même
 *     (Story — évite la coupe de sujet et donne un rendu style Instagram Reels)
 */
class BalPhotoComposer
{
    private const MODE_COVER   = 'cover';
    private const MODE_BLUR_BG = 'blur-bg';

    private ImageManager $manager;

    public function __construct()
    {
        $driver = extension_loaded('imagick') ? new ImagickDriver() : new GdDriver();
        $this->manager = new ImageManager($driver);
    }

    /** Compose TV 1920x1080 (16:9 full écran live). */
    public function composeTvPublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1920, 1080, 'dark-night-tv.png', self::MODE_COVER);
    }

    /** Compose paysage 1350x900 (3:2 partage général). */
    public function composeLandscapePublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1350, 900, 'dark-night-landscape.png', self::MODE_COVER);
    }

    /** Compose carré 1080x1080 (Instagram feed). */
    public function composeSquarePublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1080, 1080, 'dark-night-square.png', self::MODE_COVER);
    }

    /** Compose story 1080x1920 (9:16 avec fond flouté façon Instagram Reels). */
    public function composeStoryPublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1080, 1920, 'dark-night-story.png', self::MODE_BLUR_BG);
    }

    /** Pipeline commun : construction du canvas selon le mode + insert overlay. */
    private function compose(string $sourcePath, int $w, int $h, string $frameFile, string $mode): ?string
    {
        try {
            if ($mode === self::MODE_BLUR_BG) {
                // Fond = photo agrandie + floutée (style Instagram stories, comme la vidéo)
                $canvas = $this->manager->decodePath($sourcePath)->cover($w, $h)->blur(35);

                // Photo NETTE contain centrée par-dessus (jamais coupée)
                $photo = $this->manager->decodePath($sourcePath)->contain($w, $h);
                $x = intval(($w - $photo->width()) / 2);
                $y = intval(($h - $photo->height()) / 2);
                $canvas->insert($photo, $x, $y);
            } else {
                // COVER : photo remplit toute la surface
                $canvas = $this->manager->decodePath($sourcePath)->cover($w, $h);
            }

            // Overlay cadre par-dessus (respecte l'alpha PNG)
            $framePath = base_path("resources/frames/{$frameFile}");
            if (@file_exists($framePath)) {
                $frame = $this->manager->decodePath($framePath);
                $canvas->insert($frame, 0, 0);
            } else {
                \Log::warning('BalPhotoComposer frame introuvable', ['path' => $framePath]);
            }

            return (string) $canvas->encodeUsingFileExtension('jpg', quality: 90);
        } catch (\Throwable $e) {
            \Log::warning('BalPhotoComposer compose failed', [
                'err'  => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);
            return null;
        }
    }
}
