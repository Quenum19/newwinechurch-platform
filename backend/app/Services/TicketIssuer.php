<?php

namespace App\Services;

use App\Mail\TicketIssuedMail;
use App\Models\EventTicket;
use App\Services\BilletterieNotifier;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Service centralisé billetterie :
 *  - Génère le PDF pro (style Tikerama, palette NWC)
 *  - Génère les QR PNG/SVG (fallback SVG si imagick absent)
 *  - Envoie le mail avec PDF attaché + QR inline
 *
 * Synchrone. Le tmp est stocké dans storage/app/tmp/ (fiable sur mutualisé
 * Hostinger, contrairement à sys_get_temp_dir() qui peut être restreint).
 */
class TicketIssuer
{
    public function __construct(private QrPayloadService $qrService) {}

    public function issueAndSend(EventTicket $ticket): array
    {
        try {
            $ticket->load('event');

            // Tentative génération PDF — mail envoyé même si PDF échoue.
            $pdfPath = null;
            $qrPngPath = null;
            $qrSvgPath = null;
            try {
                $assets = $this->generateAssets($ticket);
                $pdfPath   = $assets['pdf_path'];
                $qrPngPath = $assets['qr_png_path'];
                $qrSvgPath = $assets['qr_svg_path'];
            } catch (\Throwable $e) {
                Log::warning('PDF generation failed, sending mail without PDF', [
                    'ticket' => $ticket->id, 'error' => $e->getMessage(),
                ]);
            }

            Mail::to($ticket->email)->send(
                new TicketIssuedMail($ticket, $pdfPath ?? '', $qrPngPath)
            );

            // Cleanup
            if ($pdfPath && file_exists($pdfPath)) @unlink($pdfPath);
            if ($qrPngPath && file_exists($qrPngPath)) @unlink($qrPngPath);
            if ($qrSvgPath && file_exists($qrSvgPath)) @unlink($qrSvgPath);

            // Sprint B — #1 Notif admin + #3 alerte capacité (best-effort).
            try {
                $notifier = app(BilletterieNotifier::class);
                if ($ticket->event) {
                    $notifier->nouvelleInscription($ticket->event, $ticket);
                    $notifier->alerteCapaciteSiSeuil($ticket->event->fresh());
                }
            } catch (\Throwable $e) {
                Log::warning('Billetterie notifier failed post-issue', [
                    'ticket' => $ticket->id, 'err' => $e->getMessage(),
                ]);
            }

            return ['sent' => true];
        } catch (\Throwable $e) {
            Log::warning('Ticket send failed', [
                'ticket' => $ticket->id, 'error' => $e->getMessage(),
            ]);
            return ['sent' => false, 'error' => $e->getMessage()];
        }
    }

    public function generateAssets(EventTicket $ticket): array
    {
        // On utilise storage/app/tmp qui EXISTE et est WRITABLE.
        // sys_get_temp_dir() sur Hostinger mutualisé peut être restreint.
        $tmpDir = storage_path('app/tmp/nwc-tickets-' . $ticket->id);
        if (! File::exists($tmpDir)) File::makeDirectory($tmpDir, 0755, true);

        // Fix Hostinger : override runtime des paths dompdf.
        // Le chroot inclut le vrai chemin des images publiques Hostinger pour que
        // dompdf puisse lire les cover_image via <img src="/home/...">.
        config([
            'dompdf.temp_dir'   => storage_path('app/tmp'),
            'dompdf.font_cache' => storage_path('app/tmp/dompdf-fonts'),
            'dompdf.chroot'     => [
                storage_path(),
                base_path('resources'),
                '/home/u781799599/domains/newinechurch.org/public_html',
            ],
        ]);
        // Crée le cache font s'il manque
        $fontCache = storage_path('app/tmp/dompdf-fonts');
        if (! File::exists($fontCache)) File::makeDirectory($fontCache, 0755, true);

        $qrPayload = $this->qrService->sign($ticket->ticket_number, $ticket->event_id);

        // SVG toujours dispo (pure PHP, aucune extension requise)
        $qrSvgPath = "$tmpDir/qr.svg";
        file_put_contents(
            $qrSvgPath,
            QrCode::format('svg')->size(500)->margin(1)->errorCorrection('M')->generate($qrPayload),
        );

        // PNG preferred pour dompdf mais nécessite imagick
        $qrPngPath = null;
        try {
            $png = QrCode::format('png')->size(500)->margin(1)->errorCorrection('M')->generate($qrPayload);
            $qrPngPath = "$tmpDir/qr.png";
            file_put_contents($qrPngPath, $png);
        } catch (\Throwable $e) {
            Log::info('QR PNG fallback to SVG', ['ticket' => $ticket->id]);
        }

        // Convertit la cover_image (souvent .webp) en PNG que dompdf sait lire.
        $coverPngPath = $this->resolveCoverPng($ticket, $tmpDir);

        $pdf = Pdf::loadView('pdfs.ticket', [
            'ticket'       => $ticket,
            'event'        => $ticket->event,
            'qrPngPath'    => $qrPngPath,
            'qrSvgPath'    => $qrSvgPath,
            'coverPngPath' => $coverPngPath, // PNG converti prêt à embed
        ])->setPaper('A4', 'portrait');

        $pdfPath = "$tmpDir/ticket.pdf";
        $pdf->save($pdfPath);

        return [
            'pdf_path'    => $pdfPath,
            'qr_png_path' => $qrPngPath,
            'qr_svg_path' => $qrSvgPath,
            'qr_payload'  => $qrPayload,
        ];
    }

    /**
     * Résout le path physique de la cover_image et la convertit en PNG.
     * Retourne le path PNG converti prêt à être inclus par dompdf, ou null.
     */
    private function resolveCoverPng(EventTicket $ticket, string $tmpDir): ?string
    {
        $event = $ticket->event;
        if (! $event?->cover_image) return null;

        // Sécurité #H4 audit : rejet des cover_image contenant des séquences
        // de traversal (../, .\, etc.). Un admin malveillant pourrait sinon
        // set cover_image="../../.env" et voir le contenu embedded dans le PDF
        // du ticket → fuite credentials DB / API keys.
        $rel = ltrim($event->cover_image, '/');
        if (str_contains($rel, '..') || str_contains($rel, "\0") || preg_match('#[/\\\\]\.{2}[/\\\\]#', $rel)) {
            Log::warning('Cover image path traversal blocked', [
                'ticket' => $ticket->id, 'raw_path' => $event->cover_image,
            ]);
            return null;
        }

        // Répertoires whitelist : storage public UNIQUEMENT (pas de /home/, pas de base_path)
        $allowedRoots = [
            realpath(storage_path('app/public')),
            realpath(base_path('public/storage')),
            realpath('/home/u781799599/domains/newinechurch.org/public_html/storage'),
            realpath('/home/u781799599/domains/newinechurch.org/public_html/api/storage'),
        ];
        $allowedRoots = array_filter($allowedRoots); // supprime les null (paths inexistants en dev)

        $candidates = [
            storage_path('app/public/' . $rel),
            base_path('public/storage/' . $rel),
            '/home/u781799599/domains/newinechurch.org/public_html/storage/' . $rel,
            '/home/u781799599/domains/newinechurch.org/public_html/api/storage/' . $rel,
        ];

        $sourcePath = null;
        foreach ($candidates as $p) {
            if (! @is_file($p) || @filesize($p) < 100) continue;
            $resolved = realpath($p);
            if (! $resolved) continue;
            // Verify le path résolu est bien dans un des roots autorisés.
            $withinRoot = false;
            foreach ($allowedRoots as $root) {
                if (str_starts_with($resolved, $root . DIRECTORY_SEPARATOR) || $resolved === $root) {
                    $withinRoot = true;
                    break;
                }
            }
            if (! $withinRoot) {
                Log::warning('Cover image path outside allowed roots', [
                    'ticket' => $ticket->id, 'resolved' => $resolved,
                ]);
                continue;
            }
            $sourcePath = $resolved;
            break;
        }
        if (! $sourcePath) return null;

        // Si c'est déjà PNG ou JPG → dompdf sait lire, pas besoin de convertir.
        $ext = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        if (in_array($ext, ['png', 'jpg', 'jpeg', 'gif'], true)) {
            return $sourcePath;
        }

        // WebP → convertir en PNG via GD
        $targetPng = $tmpDir . '/cover.png';
        try {
            if ($ext === 'webp' && function_exists('imagecreatefromwebp')) {
                $img = @imagecreatefromwebp($sourcePath);
                if ($img) {
                    imagepng($img, $targetPng);
                    imagedestroy($img);
                    return @is_file($targetPng) ? $targetPng : null;
                }
            }
            // Fallback via Intervention Image si dispo
            if (class_exists(\Intervention\Image\ImageManager::class)) {
                $manager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver());
                $img = $manager->read($sourcePath);
                $img->save($targetPng);
                return @is_file($targetPng) ? $targetPng : null;
            }
        } catch (\Throwable $e) {
            Log::info('Cover conversion failed', [
                'ticket' => $ticket->id, 'source' => $sourcePath, 'err' => $e->getMessage(),
            ]);
        }
        return null;
    }
}
