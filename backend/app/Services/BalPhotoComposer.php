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
 * 2 formats produits pour chaque upload :
 *  - Paysage 1920x1080 (écran TV, réseaux paysage)
 *  - Carré 2048x2048 avec fond flouté si photo portrait (stories Insta)
 *
 * Template overlay :
 *  - Si event.bal_template_* est défini → utilise le PNG custom
 *  - Sinon → génère un template auto par défaut (cadre or + logo NWC + textes)
 */
class BalPhotoComposer
{
    // Palette NWC
    private const GOLD    = 'c9a961';
    private const BLACK   = '0a0a0a';
    private const IVORY   = 'f5e6c8';
    private const BORDEAUX= '8b1a2f';

    /**
     * Traite une photo uploadée et sauvegarde les 3 versions.
     *
     * @param UploadedFile $file  Fichier uploadé
     * @param Event $event        Event associé (pour template + textes)
     * @return array{original: string, landscape: string, square: string}
     */
    public function process(UploadedFile $file, Event $event): array
    {
        // 1. Sauve original (backup, jamais modifié)
        $originalPath = $file->store('bal-photos/originals', 'public');
        $absOriginal  = Storage::disk('public')->path($originalPath);

        // 2. Génère version paysage 1920x1080
        $landscape = $this->composeLandscape($absOriginal, $event);
        $landscapePath = 'bal-photos/branded/landscape_' . uniqid() . '.jpg';
        Storage::disk('public')->put($landscapePath, $landscape);

        // 3. Génère version carrée 2048x2048
        $square = $this->composeSquare($absOriginal, $event);
        $squarePath = 'bal-photos/branded/square_' . uniqid() . '.jpg';
        Storage::disk('public')->put($squarePath, $square);

        return [
            'original'  => $originalPath,
            'landscape' => $landscapePath,
            'square'    => $squarePath,
        ];
    }

    /** Compose une image paysage 1920x1080 avec branding. */
    protected function composeLandscape(string $sourcePath, Event $event): string
    {
        $W = 1920;
        $H = 1080;

        // Canvas noir
        $canvas = Image::create($W, $H)->fill(self::BLACK);

        // Zone photo interne (marges pour bandeaux)
        $topBand    = 90;
        $bottomBand = 110;
        $sideMargin = 40;
        $photoW = $W - (2 * $sideMargin);
        $photoH = $H - $topBand - $bottomBand - 40;

        // Photo redimensionnée en "cover" dans la zone
        $photo = Image::read($sourcePath)
            ->cover($photoW, $photoH);

        $canvas->place($photo, 'top', $sideMargin, $topBand);

        // Overlay branding
        if ($custom = $this->getCustomTemplate($event, 'bal_template_landscape')) {
            $overlay = Image::read($custom)->resize($W, $H);
            $canvas->place($overlay, 'top-left', 0, 0);
        } else {
            $this->drawDefaultLandscapeOverlay($canvas, $event, $W, $H, $topBand, $bottomBand);
        }

        return (string) $canvas->encodeByExtension('jpg', quality: 92);
    }

    /** Compose une image carrée 2048x2048 avec fond flouté si portrait. */
    protected function composeSquare(string $sourcePath, Event $event): string
    {
        $S = 2048;

        // Canvas base = photo agrandie + floutée en fond
        $background = Image::read($sourcePath)
            ->cover($S, $S)
            ->blur(35);

        // Assombrit légèrement le fond flouté
        $background->text('', 0, 0, function (FontFactory $font) {}); // no-op safe

        // Photo centrée par-dessus
        $photo = Image::read($sourcePath);
        $ratio = $photo->width() / $photo->height();

        // Adapte la taille de la photo centrée
        $topBand    = 90;
        $bottomBand = 110;
        $sideMargin = 60;
        $maxW = $S - (2 * $sideMargin);
        $maxH = $S - $topBand - $bottomBand - 40;

        $photo->contain($maxW, $maxH);
        $x = intval(($S - $photo->width()) / 2);
        $y = $topBand + intval(($maxH - $photo->height()) / 2);
        $background->place($photo, 'top-left', $x, $y);

        // Overlay branding
        if ($custom = $this->getCustomTemplate($event, 'bal_template_square')) {
            $overlay = Image::read($custom)->resize($S, $S);
            $background->place($overlay, 'top-left', 0, 0);
        } else {
            $this->drawDefaultSquareOverlay($background, $event, $S, $topBand, $bottomBand);
        }

        return (string) $background->encodeByExtension('jpg', quality: 92);
    }

    /** Dessine le template overlay par défaut sur format paysage. */
    protected function drawDefaultLandscapeOverlay($canvas, Event $event, int $W, int $H, int $topBand, int $bottomBand): void
    {
        // Bandeau haut semi-opaque
        $canvas->drawRectangle(0, 0, function ($r) use ($W, $topBand) {
            $r->size($W, $topBand);
            $r->background('rgba(10, 10, 10, 0.85)');
        });

        // Bandeau bas semi-opaque
        $canvas->drawRectangle(0, $H - $bottomBand, function ($r) use ($W, $bottomBand) {
            $r->size($W, $bottomBand);
            $r->background('rgba(10, 10, 10, 0.90)');
        });

        // Ligne dorée sous bandeau haut
        $canvas->drawLine(function ($l) use ($W, $topBand) {
            $l->from(0, $topBand);
            $l->to($W, $topBand);
            $l->color(self::GOLD);
            $l->width(2);
        });

        // Ligne dorée sur bandeau bas
        $canvas->drawLine(function ($l) use ($W, $H, $bottomBand) {
            $l->from(0, $H - $bottomBand);
            $l->to($W, $H - $bottomBand);
            $l->color(self::GOLD);
            $l->width(2);
        });

        // Cadre fin doré
        $canvas->drawRectangle(15, 15, function ($r) use ($W, $H) {
            $r->size($W - 30, $H - 30);
            $r->border(self::GOLD, 1);
        });

        // Logo NWC en haut gauche (si dispo)
        $logo = $this->resolveLogoPath();
        if ($logo) {
            try {
                $logoImg = Image::read($logo)->resize(70, 70);
                $canvas->place($logoImg, 'top-left', 30, 10);
            } catch (\Throwable $e) { /* silencieux */ }
        }

        // Titre principal (Playfair italic simulé — police système DejaVu Serif)
        $title = $event->title ?? 'A Dark Night in Elegance';
        $canvas->text(strtoupper($title), 110, 45, function (FontFactory $f) {
            $f->filename($this->fontPath('DejaVuSerif-Italic.ttf'));
            $f->size(32);
            $f->color(self::IVORY);
            $f->align('left');
            $f->valign('middle');
        });

        // Bandeau bas : date + tagline + étoile
        $date  = $this->formatDate($event);
        $footer = strtoupper($date) . '  ·  BAL 2026  ·  NEW WINE CHURCH  ·  ★';
        $canvas->text($footer, intval($W / 2), $H - intval($bottomBand / 2), function (FontFactory $f) {
            $f->filename($this->fontPath('DejaVuSans-Bold.ttf'));
            $f->size(22);
            $f->color(self::GOLD);
            $f->align('center');
            $f->valign('middle');
        });
    }

    /** Dessine le template overlay par défaut sur format carré. */
    protected function drawDefaultSquareOverlay($canvas, Event $event, int $S, int $topBand, int $bottomBand): void
    {
        // Bandeau haut
        $canvas->drawRectangle(0, 0, function ($r) use ($S, $topBand) {
            $r->size($S, $topBand);
            $r->background('rgba(10, 10, 10, 0.85)');
        });
        // Bandeau bas
        $canvas->drawRectangle(0, $S - $bottomBand, function ($r) use ($S, $bottomBand) {
            $r->size($S, $bottomBand);
            $r->background('rgba(10, 10, 10, 0.90)');
        });

        // Lignes dorées
        $canvas->drawLine(function ($l) use ($S, $topBand) {
            $l->from(0, $topBand)->to($S, $topBand)->color(self::GOLD)->width(2);
        });
        $canvas->drawLine(function ($l) use ($S, $bottomBand) {
            $l->from(0, $S - $bottomBand)->to($S, $S - $bottomBand)->color(self::GOLD)->width(2);
        });

        // Cadre fin doré
        $canvas->drawRectangle(15, 15, function ($r) use ($S) {
            $r->size($S - 30, $S - 30);
            $r->border(self::GOLD, 1);
        });

        // Logo NWC
        $logo = $this->resolveLogoPath();
        if ($logo) {
            try {
                $logoImg = Image::read($logo)->resize(70, 70);
                $canvas->place($logoImg, 'top-left', 30, 10);
            } catch (\Throwable $e) { /* silencieux */ }
        }

        // Titre
        $title = $event->title ?? 'A Dark Night in Elegance';
        $canvas->text(strtoupper($title), 110, 45, function (FontFactory $f) {
            $f->filename($this->fontPath('DejaVuSerif-Italic.ttf'));
            $f->size(30);
            $f->color(self::IVORY);
            $f->align('left');
            $f->valign('middle');
        });

        // Footer
        $date  = $this->formatDate($event);
        $footer = strtoupper($date) . '  ·  BAL 2026  ·  NEW WINE CHURCH  ·  ★';
        $canvas->text($footer, intval($S / 2), $S - intval($bottomBand / 2), function (FontFactory $f) {
            $f->filename($this->fontPath('DejaVuSans-Bold.ttf'));
            $f->size(22);
            $f->color(self::GOLD);
            $f->align('center');
            $f->valign('middle');
        });
    }

    /** Récupère le chemin absolu d'un template custom uploadé (ou null). */
    protected function getCustomTemplate(Event $event, string $column): ?string
    {
        $path = $event->{$column} ?? null;
        if (! $path) return null;
        $abs = Storage::disk('public')->path($path);
        return @file_exists($abs) ? $abs : null;
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

    /** Trouve un fichier de font (DejaVu est installé partout avec GD). */
    protected function fontPath(string $name): string
    {
        $paths = [
            '/usr/share/fonts/truetype/dejavu/' . $name,
            base_path('resources/fonts/' . $name),
            // Fallback Windows
            'C:\\Windows\\Fonts\\arial.ttf',
        ];
        foreach ($paths as $p) {
            if (@file_exists($p)) return $p;
        }
        // Dernier recours — DejaVu bundled avec certaines images serveur
        return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    }

    /** Formate la date de l'event en "24 JUILLET 2026". */
    protected function formatDate(Event $event): string
    {
        if (! $event->starts_at) return '';
        return $event->starts_at->locale('fr')->isoFormat('D MMMM YYYY');
    }
}
