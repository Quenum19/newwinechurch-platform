<?php

namespace App\Services;

use App\Models\Event;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\ImageManager;

/**
 * Compose les photos ambiance d'un event avec cadre software.
 *
 * === Event-aware ===
 * Le service lit `events.brand_frames` (JSON) si présent :
 *   { "tv": "frames/foo-tv.png", "story": "...", "landscape": "...", "square": "..." }
 * Ces chemins sont RELATIFS à `resources/`. Fallback = frames "dark-night-*"
 * livrées par défaut (le bal 2026, encore utilisé par BalPhoto).
 *
 * === Formats ===
 *   tv        : 1920×1080 (cover) — écran live 16:9 + partage général
 *   landscape : 1350× 900 (cover) — publication Facebook
 *   square    : 1080×1080 (cover) — Instagram feed
 *   story     : 1080×1920 — Story IG/TikTok : plein cadre si photo portrait,
 *               sinon photo entière sur fond flouté
 *
 * === Modes ===
 *   COVER   : photo remplit toute la surface
 *   BLUR_BG : photo entière contain sur fond flouté d'elle-même
 */
class BalPhotoComposer
{
    private const MODE_COVER   = 'cover';
    private const MODE_BLUR_BG = 'blur-bg';

    /** [format => [w, h, defaultFrameFile, mode]] */
    private const FORMATS = [
        'tv'        => [1920, 1080, 'dark-night-tv.png',        self::MODE_COVER],
        'landscape' => [1350,  900, 'dark-night-landscape.png', self::MODE_COVER],
        'square'    => [1080, 1080, 'dark-night-square.png',    self::MODE_COVER],
        'story'     => [1080, 1920, 'dark-night-story.png',     self::MODE_BLUR_BG],
    ];

    private ImageManager $manager;

    public function __construct()
    {
        $driver = extension_loaded('imagick') ? new ImagickDriver() : new GdDriver();
        $this->manager = new ImageManager($driver);
    }

    /** Retourne la liste des formats supportés. */
    public static function formats(): array
    {
        return array_keys(self::FORMATS);
    }

    /**
     * Part minimale de la photo conservée pour passer une story en plein cadre.
     * 0.65 = on accepte de rogner jusqu'à 35 % de la largeur : une photo
     * portrait 4:5 ou 3:4 remplit la story, une photo paysage garde le fond flouté
     * (le plein cadre en couperait les deux tiers).
     */
    private const STORY_MIN_KEPT = 0.65;

    /**
     * Compose un format donné (nouvelle API event-aware).
     *
     * Mode adaptatif :
     *  - tv / paysage / carré : si le ratio de la source et celui du format
     *    diffèrent de plus de 12 %, bascule en blur-bg (photo entière visible +
     *    fond flouté) au lieu de cover qui couperait le sujet.
     *    Exemple : photo 4:3 (1.33) en TV 16:9 (1.78) → 34 % → blur-bg.
     *  - story : blur-bg par défaut, mais plein cadre (cover) dès que la photo
     *    est assez verticale (voir STORY_MIN_KEPT).
     */
    public function composeFormat(string $sourcePath, string $format, ?Event $event = null): ?string
    {
        if (! isset(self::FORMATS[$format])) return null;
        [$w, $h, $defaultFrame, $mode] = self::FORMATS[$format];

        $dim = @getimagesize($sourcePath);
        if ($dim && $dim[0] > 0 && $dim[1] > 0) {
            $sourceRatio = $dim[0] / $dim[1];
            $targetRatio = $w / $h;
            if ($mode === self::MODE_COVER) {
                if (abs($sourceRatio - $targetRatio) / $targetRatio > 0.12) {
                    $mode = self::MODE_BLUR_BG;
                }
            } elseif (min($sourceRatio, $targetRatio) / max($sourceRatio, $targetRatio) >= self::STORY_MIN_KEPT) {
                $mode = self::MODE_COVER;
            }
        }

        $frameFile = $this->resolveFrameFile($event, $format, $defaultFrame);
        return $this->compose($sourcePath, $w, $h, $frameFile, $mode);
    }

    /**
     * Version de l'algorithme composer. À bumper à chaque changement de
     * logique (cover→adaptatif, auto-pick refactor…) — invalide tous les
     * caches disque existants en un coup.
     */
    private const ALGO_VERSION = 'v3-flou-visible-story-plein-cadre';

    /**
     * Fingerprint pour la clé de cache disque : dépend du fichier source
     * (mtime + size), du cadre utilisé (mtime) ET de la version algo.
     * Change → cache invalidé.
     */
    public function cacheFingerprint(string $sourcePath, string $format, ?Event $event = null): string
    {
        if (! isset(self::FORMATS[$format])) return 'na';
        [, , $defaultFrame] = self::FORMATS[$format];
        $frameFile = $this->resolveFrameFile($event, $format, $defaultFrame);
        $framePath = base_path("resources/{$frameFile}");

        $parts = [
            self::ALGO_VERSION,
            $format,
            (string) @filemtime($sourcePath),
            (string) @filesize($sourcePath),
            $frameFile,
            (string) @filemtime($framePath),
        ];
        return substr(sha1(implode('|', $parts)), 0, 12);
    }

    // === API rétrocompatibles (utilisées par BalPhoto/upload existant) ===
    public function composeTvPublic(string $sourcePath, Event $event): ?string
    {
        return $this->composeFormat($sourcePath, 'tv', $event);
    }
    public function composeLandscapePublic(string $sourcePath, Event $event): ?string
    {
        return $this->composeFormat($sourcePath, 'landscape', $event);
    }
    public function composeSquarePublic(string $sourcePath, Event $event): ?string
    {
        return $this->composeFormat($sourcePath, 'square', $event);
    }
    public function composeStoryPublic(string $sourcePath, Event $event): ?string
    {
        return $this->composeFormat($sourcePath, 'story', $event);
    }

    /**
     * Lit event.brand_frames pour un format, avec fallback vers le frame par défaut.
     * Les chemins sont RELATIFS à resources/. Le default est "frames/dark-night-*".
     */
    private function resolveFrameFile(?Event $event, string $format, string $defaultFile): string
    {
        // Défaut historique : frames "dark-night-*" à la racine de resources/frames/
        $default = "frames/{$defaultFile}";

        if (! $event) return $default;
        $bf = $event->brand_frames;
        if (! is_array($bf)) return $default;
        $custom = $bf[$format] ?? null;
        if (! is_string($custom) || $custom === '') return $default;

        // Sécurité : jamais de traversée hors resources/
        $custom = ltrim($custom, '/');
        if (str_contains($custom, '..')) return $default;

        return $custom;
    }

    /** Pipeline commun. */
    private function compose(string $sourcePath, int $w, int $h, string $frameFile, string $mode): ?string
    {
        try {
            if ($mode === self::MODE_BLUR_BG) {
                $canvas = $this->manager->decodePath($sourcePath)->cover($w, $h)->blur(35);
                // scale() et non contain() : depuis Intervention 4, contain() renvoie
                // une image de $w×$h complétée de BLANC, qui recouvrait tout le fond flouté.
                $photo  = $this->manager->decodePath($sourcePath)->scale($w, $h);
                $x = intval(($w - $photo->width()) / 2);
                $y = intval(($h - $photo->height()) / 2);
                $canvas->insert($photo, $x, $y);
            } else {
                $canvas = $this->manager->decodePath($sourcePath)->cover($w, $h);
            }

            $framePath = base_path("resources/{$frameFile}");
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
