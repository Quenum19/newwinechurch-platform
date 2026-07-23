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
 * Lit depuis la table `site_settings` (clés `social.instagram`, `social.facebook`,
 * `social.tiktok`, `social.youtube`, `social.whatsapp`, `social.website_url`).
 * Retourne au frontend avec la convention `social_XXX` que la page attend.
 */
class NwcSocialLinksController extends Controller
{
    public function index(): JsonResponse
    {
        // clé BDD (site_settings.key) → clé API (retournée au frontend)
        $map = [
            'social.facebook'    => 'social_facebook',
            'social.instagram'   => 'social_instagram',
            'social.tiktok'      => 'social_tiktok',
            'social.youtube'     => 'social_youtube',
            'social.whatsapp'    => 'social_whatsapp',
            'social.twitter'     => 'social_twitter',
            'social.website_url' => 'website_url',
        ];

        $links = [];

        if (Schema::hasTable('site_settings')) {
            $rows = DB::table('site_settings')
                ->whereIn('key', array_keys($map))
                ->pluck('value', 'key')
                ->toArray();

            foreach ($map as $dbKey => $apiKey) {
                $val = $rows[$dbKey] ?? null;
                if ($val && trim((string) $val) !== '') {
                    $links[$apiKey] = trim((string) $val);
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
