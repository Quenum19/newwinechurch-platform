<?php

namespace App\Http\Resources\Concerns;

use Illuminate\Support\Facades\Storage;

/**
 * Trait — converti les paths storage bruts ("posts/cover-xxx.jpg") en URLs
 * ABSOLUES (https://api.newinechurch.org/storage/posts/cover-xxx.jpg).
 *
 * Indispensable quand le frontend SPA et l'API sont sur des sous-domaines
 * différents (newinechurch.org vs api.newinechurch.org) : une URL relative
 * "/storage/xxx" serait résolue par le navigateur vers l'origine du frontend
 * → 404 puisque les fichiers sont sur l'API.
 *
 * Préserve : URLs absolues déjà existantes (http://, https://) et null.
 */
trait FormatsStorageUrls
{
    protected function fullStorageUrl(?string $value): ?string
    {
        if (! $value) return null;

        // URL déjà absolue → on ne touche pas (uploads externes ou CDN)
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        // Normalise : enlève un éventuel "/storage/" préfixe + slashes en début
        $path = ltrim(str_replace('/storage/', '', $value), '/');

        return Storage::disk('public')->url($path);
    }
}
