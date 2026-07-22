<?php

namespace App\Services;

use App\Models\Event;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\ImageManager;

/**
 * Compose les photos ambiance du Bal avec cadre "A Dark Night in Elegance".
 *
 * Approche pixel-perfect : le cadre décoratif (bordures or, wordmark vertical,
 * badge date bordeaux, lockup Elegance, étoile, logo) a été pré-généré en PNG
 * transparent depuis le design Claude Design (Chrome headless → PNG 32bit alpha).
 * Ces PNG sont dans backend/resources/frames/.
 *
 * Le composer :
 *   1. Charge la photo utilisateur
 *   2. La cover au format cible (1350x900 paysage, 1080x1080 carré)
 *   3. Superpose le PNG cadre par-dessus (Intervention v4 insert respecte l'alpha)
 *   4. Encode en JPG qualité 90
 *
 * Avantages :
 *   - Rendu identique au design original (polices Google, gradients, glows, shadows)
 *   - Aucune dépendance à des polices TTF côté serveur
 *   - Refonte du cadre = régénérer le PNG, pas modifier le code
 */
class BalPhotoComposer
{
    private ImageManager $manager;

    public function __construct()
    {
        $driver = extension_loaded('imagick') ? new ImagickDriver() : new GdDriver();
        $this->manager = new ImageManager($driver);
    }

    /** Compose paysage 1350x900 (3:2). Retourne le binaire JPEG ou null si échec. */
    public function composeLandscapePublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1350, 900, 'dark-night-landscape.png');
    }

    /** Compose carré 1080x1080. Retourne le binaire JPEG ou null si échec. */
    public function composeSquarePublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1080, 1080, 'dark-night-square.png');
    }

    /** Compose story vertical 1080x1920 (9:16 Instagram/TikTok). */
    public function composeStoryPublic(string $sourcePath, Event $event): ?string
    {
        return $this->compose($sourcePath, 1080, 1920, 'dark-night-story.png');
    }

    /** Pipeline commun : photo cover + overlay PNG. */
    private function compose(string $sourcePath, int $w, int $h, string $frameFile): ?string
    {
        try {
            // 1. Photo utilisateur en cover (remplit toute la surface)
            $canvas = $this->manager->decodePath($sourcePath)->cover($w, $h);

            // 2. Overlay cadre par-dessus (transparence respectée)
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
