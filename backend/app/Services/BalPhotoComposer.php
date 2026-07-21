<?php

namespace App\Services;

use App\Models\Event;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\ImageManager;
use Intervention\Image\Typography\FontFactory;

/**
 * Compose les photos ambiance du Bal avec branding automatique.
 *
 * Utilise Intervention Image v3 via ImageManager explicite (Imagick si dispo,
 * sinon GD). Chaque étape est try/catch séparément — si le compositing plante,
 * on retourne null et le controller garde l'original.
 */
class BalPhotoComposer
{
    // Palette NWC
    private const GOLD  = 'c9a961';
    private const BLACK = '#0a0a0a';
    private const IVORY = 'f5e6c8';

    private ImageManager $manager;

    public function __construct()
    {
        // Imagick prioritaire (meilleur rendu texte + qualité), GD en fallback
        $driver = extension_loaded('imagick') ? new ImagickDriver() : new GdDriver();
        $this->manager = new ImageManager($driver);
    }

    /** Compose l'image paysage 1920x1080. Retourne le binaire JPEG ou null si échec. */
    public function composeLandscapePublic(string $sourcePath, Event $event): ?string
    {
        try {
            $W = 1920;
            $H = 1080;

            $canvas = $this->manager->create($W, $H)->fill(self::BLACK);

            $topBand    = 90;
            $bottomBand = 110;
            $sideMargin = 40;
            $photoW = $W - (2 * $sideMargin);
            $photoH = $H - $topBand - $bottomBand - 40;

            $photo = $this->manager->read($sourcePath)->cover($photoW, $photoH);
            $canvas->place($photo, 'top-left', $sideMargin, $topBand);

            $this->drawBands($canvas, $event, $W, $H, $topBand, $bottomBand);

            return (string) $canvas->encodeByExtension('jpg', quality: 90);
        } catch (\Throwable $e) {
            \Log::warning('composeLandscape failed', [
                'err'  => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);
            return null;
        }
    }

    /** Compose l'image carrée 2048x2048 avec fond flouté. */
    public function composeSquarePublic(string $sourcePath, Event $event): ?string
    {
        try {
            $S = 2048;

            $canvas = $this->manager->read($sourcePath)->cover($S, $S)->blur(35);

            $topBand    = 90;
            $bottomBand = 110;
            $sideMargin = 60;
            $maxW = $S - (2 * $sideMargin);
            $maxH = $S - $topBand - $bottomBand - 40;

            $photo = $this->manager->read($sourcePath)->contain($maxW, $maxH);
            $x = intval(($S - $photo->width()) / 2);
            $y = $topBand + intval(($maxH - $photo->height()) / 2);
            $canvas->place($photo, 'top-left', $x, $y);

            $this->drawBands($canvas, $event, $S, $S, $topBand, $bottomBand);

            return (string) $canvas->encodeByExtension('jpg', quality: 90);
        } catch (\Throwable $e) {
            \Log::warning('composeSquare failed', [
                'err'  => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);
            return null;
        }
    }

    /**
     * Dessine bandeaux haut/bas + logo + textes.
     * Chaque draw est isolé — un échec sur le logo ne casse pas le texte.
     */
    protected function drawBands($canvas, Event $event, int $W, int $H, int $topBand, int $bottomBand): void
    {
        // Bandeaux noirs semi-opaques
        try {
            $topStrip = $this->manager->create($W, $topBand)->fill('#0a0a0a');
            $canvas->place($topStrip, 'top-left', 0, 0, opacity: 90);

            $bottomStrip = $this->manager->create($W, $bottomBand)->fill('#0a0a0a');
            $canvas->place($bottomStrip, 'top-left', 0, $H - $bottomBand, opacity: 92);
        } catch (\Throwable $e) {
            \Log::warning('drawBands strips failed', ['err' => $e->getMessage()]);
        }

        // Logo NWC (haut gauche)
        try {
            $logo = $this->resolveLogoPath();
            if ($logo) {
                $logoImg = $this->manager->read($logo)->scale(70, 70);
                $canvas->place($logoImg, 'top-left', 30, 10);
            }
        } catch (\Throwable $e) {
            \Log::warning('drawBands logo failed', ['err' => $e->getMessage()]);
        }

        // Titre en haut
        try {
            $title = strtoupper($event->title ?? 'A Dark Night in Elegance');
            $canvas->text($title, 115, intval($topBand / 2) + 4, function (FontFactory $f) {
                $f->filename($this->fontPath('DejaVuSans-Bold.ttf'));
                $f->size(28);
                $f->color(self::IVORY);
                $f->align('left');
                $f->valign('middle');
            });
        } catch (\Throwable $e) {
            \Log::warning('drawBands title failed', ['err' => $e->getMessage()]);
        }

        // Footer en bas
        try {
            $date = $this->formatDate($event);
            $footer = strtoupper($date) . '  ·  BAL 2026  ·  NEW WINE CHURCH  ·  ' . chr(9733);
            $canvas->text($footer, intval($W / 2), $H - intval($bottomBand / 2), function (FontFactory $f) {
                $f->filename($this->fontPath('DejaVuSans-Bold.ttf'));
                $f->size(22);
                $f->color(self::GOLD);
                $f->align('center');
                $f->valign('middle');
            });
        } catch (\Throwable $e) {
            \Log::warning('drawBands footer failed', ['err' => $e->getMessage()]);
        }
    }

    /** Résout le chemin absolu du logo NWC. */
    protected function resolveLogoPath(): ?string
    {
        $candidates = [
            public_path('logos/logo_newwine.png'),
            base_path('public/logos/logo_newwine.png'),
            dirname(base_path()) . '/public_html/logos/logo_newwine.png',
            dirname(base_path()) . '/domains/newinechurch.org/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $c) {
            if (@file_exists($c)) return $c;
        }
        $cached = storage_path('app/exports-logo-cache/logo_newwine.png');
        return @file_exists($cached) ? $cached : null;
    }

    /** Trouve un font DejaVu (fallback système). */
    protected function fontPath(string $name): string
    {
        $paths = [
            '/usr/share/fonts/truetype/dejavu/' . $name,
            '/usr/share/fonts/dejavu/' . $name,
            base_path('resources/fonts/' . $name),
            'C:\\Windows\\Fonts\\arial.ttf',
        ];
        foreach ($paths as $p) {
            if (@file_exists($p)) return $p;
        }
        return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    }

    protected function formatDate(Event $event): string
    {
        if (! $event->starts_at) return '';
        return $event->starts_at->locale('fr')->isoFormat('D MMMM YYYY');
    }
}
