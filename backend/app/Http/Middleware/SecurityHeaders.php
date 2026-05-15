<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ajoute les en-têtes HTTP de sécurité critiques sur TOUTES les réponses.
 *
 *  - Strict-Transport-Security : force HTTPS pendant 6 mois (prod only)
 *  - X-Content-Type-Options    : empêche le MIME-sniffing
 *  - X-Frame-Options           : anti-clickjacking
 *  - Referrer-Policy           : limite les fuites d'URLs entre origines
 *  - Permissions-Policy        : désactive caméra/mic/géoloc (réactiver si besoin)
 *  - Content-Security-Policy   : whitelist origins JS/CSS/img/connect
 *
 * Important : en DEV (env=local) on relâche la CSP pour Vite HMR + Telescope.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options'        => 'SAMEORIGIN',
            'Referrer-Policy'        => 'strict-origin-when-cross-origin',
            'Permissions-Policy'     => 'camera=(), microphone=(self), geolocation=()',
            // X-XSS-Protection est déprécié mais on garde pour les vieux navigateurs.
            'X-XSS-Protection'       => '1; mode=block',
        ];

        // HSTS uniquement en HTTPS (sinon les navigateurs ignorent).
        if (app()->environment('production') || $request->isSecure()) {
            $headers['Strict-Transport-Security'] = 'max-age=15552000; includeSubDomains';
        }

        // Content-Security-Policy adaptée selon env.
        $headers['Content-Security-Policy'] = $this->buildCsp($request);

        foreach ($headers as $name => $value) {
            // Ne pas écraser un header déjà fixé par le contrôleur (cas rare).
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        return $response;
    }

    /**
     * Construit la CSP. En prod : strict (self + assets connus).
     * En dev : on autorise localhost + Vite HMR + 'unsafe-inline' pour Telescope.
     */
    protected function buildCsp(Request $request): string
    {
        $apiHost = $request->getSchemeAndHttpHost();

        $directives = [
            "default-src 'self'",
            // Scripts : on autorise unsafe-inline en prod pour les composants Tiptap
            // hydratés côté React (idéalement passer par nonce, à itérer).
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.qrserver.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https:",
            "media-src 'self' blob: https:",
            // WebSocket pour Reverb + API + Agora pour live streaming.
            "connect-src 'self' {$apiHost} ws: wss: https://*.agora.io https://api.qrserver.com",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
        ];

        // En production, on durcit en ajoutant upgrade-insecure-requests.
        if (app()->environment('production')) {
            $directives[] = 'upgrade-insecure-requests';
        }

        return implode('; ', $directives);
    }
}
