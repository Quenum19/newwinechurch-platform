<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;
use Intervention\Image\Typography\FontFactory;

/**
 * Compose les photos ambiance du Bal avec branding automatique.
 *
 * Version robuste : chaque compositing est try/catch séparément.
 * Si Intervention Image v4 ne supporte pas un draw, on renvoie null
 * et le controller garde l'original.
 */
class BalPhotoComposer
{
    // Palette NWC
    private const GOLD    = 'c9a961';
    private const BLACK   = '#0a0a0a';
    private const IVORY   = 'f5e6c8';

    /**
     * Compose l'image paysage 1920x1080. Retourne le binary JPEG ou null si échec.
     */
    public function composeLandscapePublic(string $sourcePath, Event $event): ?string
    {
        try {
            $W = 1920;
            $H = 1080;

            $canvas = Image::create($W, $H)->fill(self::BLACK);

            // Zone photo interne
            $topBand    = 90;
            $bottomBand = 110;
            $sideMargin = 40;
            $photoW = $W - (2 * $sideMargin);
            $photoH = $H - $topBand - $bottomBand - 40;

            $photo = Image::read($sourcePath)->cover($photoW, $photoH);
            $canvas->place($photo, 'top', $sideMargin, $topBand);

            $this->drawBands($canvas, $event, $W, $H, $topBand, $bottomBand, true);

            return (string) $canvas->encodeByExtension('jpg', quality: 90);
        } catch (\Throwable $e) {
            \Log::warning('composeLandscape failed', ['err' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Compose l'image carrée 2048x2048 (fond flouté si portrait).
     */
    public function composeSquarePublic(string $sourcePath, Event $event): ?string
    {
        try {
            $S = 2048;

            // Fond = photo agrandie + floutée
            $canvas = Image::read($sourcePath)->cover($S, $S)->blur(35);

            $topBand    = 90;
            $bottomBand = 110;
            $sideMargin = 60;
            $maxW = $S - (2 * $sideMargin);
            $maxH = $S - $topBand - $bottomBand - 40;

            // Photo centrée en "contain"
            $photo = Image::read($sourcePath)->contain($maxW, $maxH);
            $x = intval(($S - $photo->width()) / 2);
            $y = $topBand + intval(($maxH - $photo->height()) / 2);
            $canvas->place($photo, 'top-left', $x, $y);

            $this->drawBands($canvas, $event, $S, $S, $topBand, $bottomBand, false);

            return (string) $canvas->encodeByExtension('jpg', quality: 90);
        } catch (\Throwable $e) {
            \Log::warning('composeSquare failed', ['err' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Dessine bandeaux haut/bas + logo + textes.
     * Ces draw sont dans un try/catch pour ne pas casser tout le composer
     * si la version Intervention diffère de ce qu'on attend.
     */
    protected function drawBands($canvas, Event $event, int $W, int $H, int $topBand, int $bottomBand, bool $isLandscape): void
    {
        try {
            // Bandeau haut : image PNG semi-opaque générée en simple
            $topStrip = Image::create($W, $topBand)->fill('#0a0a0a');
            $canvas->place($topStrip, 'top-left', 0, 0, opacity: 90);

            // Bandeau bas
            $bottomStrip = Image::create($W, $bottomBand)->fill('#0a0a0a');
            $canvas->place($bottomStrip, 'top-left', 0, $H - $bottomBand, opacity: 92);
        } catch (\Throwable $e) {
            \Log::warning('drawBands strip failed', ['err' => $e->getMessage()]);
        }

        // Logo NWC (haut gauche)
        try {
            $logo = $this->resolveLogoPath();
            if ($logo) {
                $logoImg = Image::read($logo)->scale(70, 70);
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
            \Log::warning('drawBands title text failed', ['err' => $e->getMessage()]);
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
            \Log::warning('drawBands footer text failed', ['err' => $e->getMessage()]);
        }
    }

    /** Résout le chemin du logo NWC. */
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
