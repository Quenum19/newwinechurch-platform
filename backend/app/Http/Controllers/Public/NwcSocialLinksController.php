<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Retourne les liens des réseaux sociaux NWC pour la page publique
 * "Follow us" accessible via QR code sur les supports de table.
 *
 * Lit depuis la table settings existante (clés social_facebook, etc.).
 * Retourne les valeurs en clair (URLs publiques, pas de secret).
 */
class NwcSocialLinksController extends Controller
{
    public function index(): JsonResponse
    {
        $keys = [
            'social_facebook',
            'social_instagram',
            'social_tiktok',
            'social_youtube',
            'social_whatsapp',
            'social_twitter',
            'website_url',
        ];

        $links = [];

        if (Schema::hasTable('settings')) {
            $rows = DB::table('settings')
                ->whereIn('key', $keys)
                ->pluck('value', 'key')
                ->toArray();

            foreach ($keys as $k) {
                $val = $rows[$k] ?? null;
                if ($val && trim((string) $val) !== '') {
                    $links[$k] = trim((string) $val);
                }
            }
        }

        // Fallback website si non configuré
        if (empty($links['website_url'])) {
            $links['website_url'] = config('app.frontend_url', 'https://newinechurch.org');
        }

        return response()->json(['links' => $links]);
    }
}
