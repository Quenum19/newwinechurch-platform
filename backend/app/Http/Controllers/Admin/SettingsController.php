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
     * Upload d'un asset de branding (logo NWC, logo Maison Destinée, hero image accueil).
     *
     * 3 cibles autorisées :
     *  - logo.nwc          : logo principal (≤ 2 Mo, max 1200x1200)
     *  - logo.parent       : logo Maison de la Destinée (idem)
     *  - branding.hero_image : photo de fond du hero accueil (≤ 8 Mo, photo paysage HD)
     *
     * Pour le hero, on autorise jusqu'à 8 Mo car c'est une photo HD paysage.
     * Pas de SVG pour le hero (ça n'a pas de sens pour une photographie).
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        if (! $request->user()->can('manage logos')) abort(403);

        $isHero = $request->input('target') === 'branding.hero_image';

        $request->validate([
            // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'logo' => $isHero
                ? [
                    'required', 'file',
                    'mimes:jpg,jpeg,png,webp',
                    'mimetypes:image/jpeg,image/png,image/webp',
                    'max:8192', // 8 Mo pour photo HD paysage
                    new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp']),
                ]
                : [
                    'required', 'file',
                    'mimes:png,jpg,jpeg,webp,svg',
                    'mimetypes:image/png,image/jpeg,image/webp,image/svg+xml',
                    'max:2048',
                    new SafeUploadedFile(['png', 'jpg', 'jpeg', 'webp', 'svg']),
                ],
            'target' => ['required', 'in:logo.nwc,logo.parent,branding.hero_image'],
        ]);

        $file = $request->file('logo');
        $disk = Storage::disk(config('filesystems.default'));

        // Stockage avec nom unique pour éviter les conflits CDN cache.
        // Sous-dossier différent pour le hero vs les logos.
        $ext  = $file->getClientOriginalExtension() ?: 'png';
        $folder = $isHero ? 'branding/hero' : 'logos';
        $path = sprintf('%s/%s.%s', $folder, bin2hex(random_bytes(8)), $ext);
        $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);

        // Si un ancien logo existe (et n'est pas une URL externe), on le supprime.
        $key = $request->input('target');
        $old = SiteSetting::get($key);
        if ($old && ! str_starts_with($old, 'http') && ! str_starts_with($old, '/logos/logo_')) {
            // /logos/logo_newwine.png et /logos/logo_md.png sont les fichiers livrés
            // avec l'app, on les protège — sinon on supprime l'ancien path uploadé.
            $oldPath = ltrim(str_replace('/storage/', '', $old), '/');
            if ($disk->exists($oldPath)) $disk->delete($oldPath);
        }

        // Mise à jour de la setting.
        SiteSetting::set($key, '/storage/'.$path, 'image', 'branding');

        return response()->json([
            'message' => 'Logo mis à jour.',
            'url'     => '/storage/'.$path,
        ]);
    }
}
