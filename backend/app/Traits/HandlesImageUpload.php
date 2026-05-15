<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Trait à inclure dans les controllers qui acceptent des uploads d'images
 * (cover, thumbnail). Centralise le pattern :
 *
 *   1. Lecture du fichier original
 *   2. Redimensionnement (cover / contain / scaleDown)
 *   3. Conversion WebP qualité ajustable
 *   4. Stockage final sur le disque public
 *   5. Mise à jour atomique du modèle (attribut dédié)
 *   6. Suppression de l'ancienne image éventuelle
 *
 * Synchrone : pas de queue → l'image est dispo immédiatement après la requête.
 * Justification : le projet ne tourne pas de worker en local Wamp, et Intervention
 * Image avec GD prend < 500ms même sur des photos 4000×3000.
 *
 * Pour des sites à très haut trafic, on pourrait basculer vers une vraie queue,
 * mais pour NWC le sync est plus fiable et plus simple à déboguer.
 */
trait HandlesImageUpload
{
    /**
     * Traite et stocke une image uploadée. Met à jour le modèle en BDD.
     *
     * @param Model        $model      Modèle Eloquent à mettre à jour
     * @param UploadedFile $file       Fichier uploadé (déjà validé par FormRequest)
     * @param string       $attribute  Nom de l'attribut à mettre à jour (ex: 'thumbnail')
     * @param string       $targetDir  Dossier de stockage (ex: 'sermons/thumbnails')
     * @param array        $options    ['max_width', 'max_height', 'fit', 'quality']
     */
    protected function processAndStoreImage(
        Model $model,
        UploadedFile $file,
        string $attribute,
        string $targetDir,
        array $options = [],
    ): void {
        $maxWidth  = $options['max_width']  ?? 1920;
        $maxHeight = $options['max_height'] ?? 1080;
        $fit       = $options['fit']        ?? 'cover';
        $quality   = $options['quality']    ?? 85;

        try {
            $manager = new ImageManager(new GdDriver());
            $image   = $manager->decode($file->getRealPath());

            // Redimensionnement.
            if ($maxWidth && $maxHeight) {
                match ($fit) {
                    'cover'     => $image->cover($maxWidth, $maxHeight),
                    'contain'   => $image->contain($maxWidth, $maxHeight),
                    'scaleDown' => $image->scaleDown($maxWidth, $maxHeight),
                    default     => $image->scaleDown($maxWidth, $maxHeight),
                };
            }

            $webp = (string) $image->encode(new WebpEncoder(quality: $quality));

            $disk      = Storage::disk(config('filesystems.default'));
            $finalPath = sprintf(
                '%s/%s.webp',
                trim($targetDir, '/'),
                bin2hex(random_bytes(16)),
            );
            $disk->put($finalPath, $webp, ['visibility' => 'public']);

            $oldPath = $model->{$attribute};

            // Update atomique (sans events ni timestamps).
            $model::where('id', $model->id)->update([$attribute => $finalPath]);
            $model->{$attribute} = $finalPath;

            // Nettoyage de l'ancienne image.
            if ($oldPath && ! str_starts_with($oldPath, 'http') && $disk->exists($oldPath)) {
                $disk->delete($oldPath);
            }
        } catch (\Throwable $e) {
            Log::error('processAndStoreImage failed', [
                'model'     => get_class($model),
                'id'        => $model->id,
                'attribute' => $attribute,
                'error'     => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Alias rétrocompatible pour les contrôleurs existants — appelle
     * processAndStoreImage en sync.
     */
    protected function dispatchImageProcessing(
        Model $model,
        UploadedFile $file,
        string $attribute,
        string $targetDir,
        array $options = [],
    ): void {
        $this->processAndStoreImage($model, $file, $attribute, $targetDir, $options);
    }
}
