<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Génère le PDF des supports de table imprimables (recto QR vote + verso QR follow us).
 *
 * Format A5 recto-verso, design NWC noir/or/rouge, 2 QR codes générés en SVG.
 * L'organisateur imprime en autant d'exemplaires que de tables.
 */
class BalSupportsController extends Controller
{
    public function tableSupportsPdf(Request $request, int $eventId): Response
    {
        $user = $request->user();
        if (! $user?->can('manage event tickets') && ! $user?->can('view attendance')) {
            abort(403);
        }

        $event = Event::findOrFail($eventId);

        // URLs cibles des QR codes
        $frontendUrl = rtrim(config('app.frontend_url', 'https://newinechurch.org'), '/');
        $voteUrl   = $frontendUrl . '/bal/vote/' . $event->id;
        $followUrl = $frontendUrl . '/nwc/follow';

        // QR codes en SVG data URI (embed direct dans le HTML)
        $voteQr   = $this->generateQrSvg($voteUrl);
        $followQr = $this->generateQrSvg($followUrl);

        // Logo NWC en data URI
        $logoDataUri = $this->resolveLogoDataUri();

        $pdf = Pdf::loadView('pdfs.bal-table-supports', [
            'event'       => $event,
            'voteUrl'     => $voteUrl,
            'followUrl'   => $followUrl,
            'voteQr'      => $voteQr,
            'followQr'    => $followQr,
            'logoDataUri' => $logoDataUri,
        ])->setPaper('a5', 'portrait');

        $filename = 'bal-supports-table-' . now()->format('Ymd-Hi') . '.pdf';
        return $pdf->stream($filename);
    }

    /** Génère un QR code SVG en data URI. */
    private function generateQrSvg(string $url): string
    {
        $svg = QrCode::size(400)
            ->margin(1)
            ->format('svg')
            ->color(10, 10, 10)      // Noir profond
            ->backgroundColor(245, 230, 200)  // Ivoire chaud
            ->generate($url);

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    /**
     * Résout le logo NWC en data URI base64.
     *
     * Cherche localement puis fallback : télécharge depuis frontend public
     * et cache le résultat pour les prochains exports. Identique au pattern
     * MembersExport (robuste sur Hostinger où le logo est côté public_html).
     */
    private function resolveLogoDataUri(): ?string
    {
        // 1. Chemins locaux probables
        $candidates = [
            public_path('logos/logo_newwine.png'),
            base_path('public/logos/logo_newwine.png'),
            dirname(base_path()) . '/public_html/logos/logo_newwine.png',
            dirname(base_path()) . '/domains/newinechurch.org/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $path) {
            if ($path && @file_exists($path)) {
                return 'data:image/png;base64,' . base64_encode(@file_get_contents($path));
            }
        }

        // 2. Cache local (téléchargé une fois puis réutilisé)
        $cached = storage_path('app/exports-logo-cache/logo_newwine.png');
        if (@file_exists($cached) && filesize($cached) > 500) {
            return 'data:image/png;base64,' . base64_encode(@file_get_contents($cached));
        }

        // 3. Fallback : télécharge depuis le frontend public + cache
        $url = rtrim(config('app.frontend_url', 'https://newinechurch.org'), '/')
             . '/logos/logo_newwine.png';
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 5, 'follow_location' => 1]]);
            $content = @file_get_contents($url, false, $ctx);
            if ($content && strlen($content) > 500) {
                @mkdir(dirname($cached), 0775, true);
                @file_put_contents($cached, $content);
                return 'data:image/png;base64,' . base64_encode($content);
            }
        } catch (\Throwable $e) {
            // silencieux — fallback placeholder utilisé côté template
        }

        return null;
    }
}
