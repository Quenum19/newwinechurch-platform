<?php

namespace App\Services;

/**
 * Sanitiseur HTML pour le contenu des articles (Tiptap).
 *
 * Stratégie : whitelist stricte.
 *  - Tags autorisés : p, h1-h6, strong, em, u, s, ul, ol, li, blockquote,
 *    pre, code, br, hr, a (avec rel/target safe), img (sans script).
 *  - Attributs autorisés : href (a), src/alt/title (img), class (limité).
 *  - URLs : http, https, mailto, et / (chemin local) uniquement.
 *  - Filtre les data-uri pour empêcher l'injection inline (XSS).
 *
 * NB : on n'utilise pas HTMLPurifier (lourd, ~10MB de config) car notre besoin
 * est limité. Pour scaler, on pourrait switcher vers ezyang/htmlpurifier en
 * Phase 8 si on observe des cas particuliers d'injection.
 */
class HtmlSanitizer
{
    /** Tags autorisés. */
    private const ALLOWED_TAGS = '<p><h1><h2><h3><h4><h5><h6>'
        .'<strong><b><em><i><u><s><del><ins><mark>'
        .'<ul><ol><li><blockquote><pre><code>'
        .'<br><hr><a><img><figure><figcaption>'
        .'<table><thead><tbody><tr><td><th>'
        .'<span><div>';

    /**
     * Nettoie une chaîne HTML.
     */
    public static function clean(?string $html): string
    {
        if (! $html) return '';

        // 1. strip_tags avec whitelist : retire tout ce qui n'est pas autorisé
        //    (script, iframe, object, embed, style sont éliminés).
        $clean = strip_tags($html, self::ALLOWED_TAGS);

        // 2. Retire les attributs dangereux (on*=, javascript:, data:).
        $clean = preg_replace_callback(
            '/<([a-z][a-z0-9]*)((?:\s+[^>]*)?)>/i',
            fn ($m) => '<' . strtolower($m[1]) . self::sanitizeAttributes($m[2]) . '>',
            $clean
        );

        return trim($clean);
    }

    /**
     * Filtre les attributs HTML pour ne garder que les sûrs.
     * Supprime : on* events, javascript:, vbscript:, data: (sauf data:image safe).
     */
    private static function sanitizeAttributes(string $attrsRaw): string
    {
        if (! preg_match_all('/(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*\'([^\']*)\'/i', $attrsRaw, $matches, PREG_SET_ORDER)) {
            return '';
        }

        $allowedAttrs = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'colspan', 'rowspan', 'width', 'height'];
        $kept = [];

        foreach ($matches as $m) {
            $name  = strtolower($m[1] ?: $m[3]);
            $value = $m[2] ?: $m[4];

            // Whitelist d'attributs.
            if (! in_array($name, $allowedAttrs, true)) continue;

            // URLs : on autorise http(s), mailto, fragment, et chemin relatif/absolu.
            if (in_array($name, ['href', 'src'], true)) {
                $value = trim($value);
                if (preg_match('/^(javascript|vbscript|data):/i', $value)) {
                    continue; // bloque XSS
                }
                if (! preg_match('#^(https?:|mailto:|/|\#|\.)#i', $value)) {
                    continue; // refuse URLs inhabituelles
                }
            }

            // Force rel="noopener noreferrer" sur les liens target=_blank (sécurité).
            $kept[$name] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        }

        // Sécurité link target=_blank → ajoute rel.
        if (isset($kept['target']) && stripos($kept['target'], '_blank') !== false) {
            $kept['rel'] = 'noopener noreferrer';
        }

        $out = '';
        foreach ($kept as $k => $v) {
            $out .= ' '.$k.'="'.$v.'"';
        }
        return $out;
    }
}
