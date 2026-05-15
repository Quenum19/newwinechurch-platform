<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Règle de validation Laravel — Validation stricte d'un fichier uploadé.
 *
 *  - Vérifie que l'extension correspond à la liste blanche
 *  - Vérifie les magic bytes (signature binaire réelle) via finfo
 *  - Refuse les fichiers exécutables / scripts cachés sous une extension valide
 *
 * Usage :
 *   'avatar' => ['required', 'file', new SafeUploadedFile(['jpg', 'png', 'webp'])],
 */
class SafeUploadedFile implements ValidationRule
{
    /** MIME types autorisés par extension. */
    protected const ALLOWED_MIME_MAP = [
        'jpg'  => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png'  => ['image/png'],
        'webp' => ['image/webp'],
        'gif'  => ['image/gif'],
        'svg'  => ['image/svg+xml', 'text/xml', 'text/html'], // svg accepté avec précaution
        'pdf'  => ['application/pdf'],
        'mp3'  => ['audio/mpeg', 'audio/mp3'],
        'mp4'  => ['video/mp4', 'application/octet-stream'],
        'webm' => ['video/webm'],
    ];

    /** Extensions/magic bytes interdits, peu importe l'extension du fichier. */
    protected const BLOCKED_SIGNATURES = [
        'MZ',          // exe Windows
        '#!/',         // shebang script
        '<?php',       // PHP code
        '<%',          // ASP code
        '<script',     // HTML script (cas SVG malveillant)
    ];

    /** @param array<string> $allowedExtensions Extensions autorisées (sans le point). */
    public function __construct(
        protected array $allowedExtensions,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail("Le fichier est invalide ou corrompu.");
            return;
        }

        $extension = strtolower($value->getClientOriginalExtension());

        // 1. Vérif extension whitelist.
        if (! in_array($extension, $this->allowedExtensions, true)) {
            $fail("Extension .{$extension} non autorisée. Extensions acceptées : ".implode(', ', $this->allowedExtensions));
            return;
        }

        // 2. Vérif MIME via finfo (lit le contenu réel, pas le Content-Type client).
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo ? finfo_file($finfo, $value->getRealPath()) : null;
        if ($finfo) finfo_close($finfo);

        $expectedMimes = self::ALLOWED_MIME_MAP[$extension] ?? null;
        if ($expectedMimes && $detectedMime && ! in_array($detectedMime, $expectedMimes, true)) {
            $fail("Le contenu réel du fichier ({$detectedMime}) ne correspond pas à l'extension .{$extension}.");
            return;
        }

        // 3. Lecture des premiers bytes pour détecter des signatures malicieuses
        //    cachées (ex: un script PHP renommé en .png).
        $fp = @fopen($value->getRealPath(), 'rb');
        if ($fp) {
            $head = (string) fread($fp, 1024);
            fclose($fp);

            foreach (self::BLOCKED_SIGNATURES as $sig) {
                if (str_contains($head, $sig)) {
                    $fail("Le fichier contient une signature interdite (potentiellement exécutable).");
                    return;
                }
            }
        }
    }
}
