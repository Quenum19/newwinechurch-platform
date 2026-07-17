<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\SiteSetting;
use App\Rules\SafeUploadedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Admin → Paramètres dynamiques du site.
 *
 *  GET  /api/admin/settings           → tous (groupés)
 *  PUT  /api/admin/settings           → batch update
 *  POST /api/admin/settings/logo      → upload logo NWC ou Maison Destinée
 */
class SettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('manage settings')) abort(403);

        $rows = SiteSetting::query()->get();

        // Regroupement par "group" → { identity: {...}, contact: {...}, ... }.
        $tree = [];
        foreach ($rows as $row) {
            $group = $row->group ?: 'misc';
            $tree[$group][] = [
                'key'   => $row->key,
                'value' => $row->value,
                'type'  => $row->type,
            ];
        }
        return response()->json($tree);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $userId = $request->user()->id;

        DB::transaction(function () use ($request, $userId) {
            foreach ($request->validated('settings') as $key => $value) {
                SiteSetting::where('key', $key)
                    ->update(['value' => $value, 'updated_by' => $userId]);
            }
        });

        return response()->json([
            'message' => 'Paramètres mis à jour.',
        ]);
    }

    /**
     * Upload d'un asset de branding (logo NWC, logo parent, hero image/video).
     *
     * 4 cibles autorisées :
     *  - logo.nwc            : logo principal (≤ 2 Mo)
     *  - logo.parent         : logo Maison de la Destinée (≤ 2 Mo)
     *  - branding.hero_image : photo de fond du hero (≤ 8 Mo)
     *  - branding.hero_video : vidéo de fond du hero, autoplay muet (≤ 30 Mo, mp4/webm)
     *
     * Pour la vidéo hero : recommandé 1080p loop court (10-20s) pour rester
     * léger. Le frontend l'utilise en priorité si présente, sinon fallback image.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        if (! $request->user()->can('manage logos')) abort(403);

        $target = $request->input('target');
        $isHero      = $target === 'branding.hero_image';
        $isHeroVideo = $target === 'branding.hero_video';

        $request->validate([
            'logo' => $isHeroVideo
                ? [
                    'required', 'file',
                    'mimes:mp4,webm,mov',
                    'max:30720', // 30 Mo
                ]
                : ($isHero
                ? [
                    'required', 'file',
                    'mimes:jpg,jpeg,png,webp',
                    'mimetypes:image/jpeg,image/png,image/webp',
                    'max:8192', // 8 Mo
                    new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp']),
                ]
                : [
                    'required', 'file',
                    'mimes:png,jpg,jpeg,webp,svg',
                    'mimetypes:image/png,image/jpeg,image/webp,image/svg+xml',
                    'max:2048',
                    new SafeUploadedFile(['png', 'jpg', 'jpeg', 'webp', 'svg']),
                ]),
            'target' => ['required', 'in:logo.nwc,logo.parent,branding.hero_image,branding.hero_video'],
        ]);

        $file = $request->file('logo');
        $disk = Storage::disk(config('filesystems.default'));

        // Stockage avec nom unique pour éviter les conflits CDN cache.
        $ext  = $file->getClientOriginalExtension() ?: ($isHeroVideo ? 'mp4' : 'png');
        $folder = $isHeroVideo ? 'branding/hero-video' : ($isHero ? 'branding/hero' : 'logos');
        $path = sprintf('%s/%s.%s', $folder, bin2hex(random_bytes(8)), $ext);
        $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);

        // Si un ancien logo existe (et n'est pas une URL externe), on le supprime.
        $key = $request->input('target');
        $old = SiteSetting::get($key);
        if ($old && ! str_starts_with($old, '/logos/logo_')) {
            // /logos/logo_newwine.png et /logos/logo_md.png sont les fichiers livrés
            // avec l'app, on les protège — sinon on supprime l'ancien path uploadé.
            // On extrait la partie après "/storage/" qu'elle soit dans une URL
            // absolue (https://api.../storage/xxx) ou relative (/storage/xxx).
            $oldPath = $old;
            if (($p = strpos($old, '/storage/')) !== false) {
                $oldPath = substr($old, $p + strlen('/storage/'));
            }
            if ($disk->exists($oldPath)) $disk->delete($oldPath);
        }

        // URL ABSOLUE — indispensable quand le frontend et l'API sont sur des
        // sous-domaines différents (newinechurch.org vs api.newinechurch.org).
        // Avant on stockait "/storage/..." (relative) qui résolvait vers le frontend.
        $publicUrl = $disk->url($path);

        // Mise à jour de la setting.
        SiteSetting::set($key, $publicUrl, 'image', 'branding');

        return response()->json([
            'message' => 'Logo mis à jour.',
            'url'     => $publicUrl,
        ]);
    }
}
