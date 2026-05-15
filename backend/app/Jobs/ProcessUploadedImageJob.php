<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Job générique de traitement d'image uploadée.
 *
 * Pipeline :
 *   1. Lit le fichier original (chemin temporaire)
 *   2. Redimensionne au format demandé (cover/contain/none)
 *   3. Convertit en WebP qualité 85
 *   4. Strip EXIF (anti-doxing)
 *   5. Stocke à `<targetDir>/<random>.webp` sur le disque public
 *   6. Met à jour le modèle ($modelClass:$modelId, attribut $attribute)
 *   7. Supprime l'ancienne image si présente + le fichier temporaire
 *
 * Réutilisable pour : sermons.thumbnail, events.cover_image, posts.cover_image,
 * media_gallery.file_path, sermon_series.cover_image, settings.logo.*.
 *
 * Pour millions d'utilisateurs : ce job tourne sur des workers indépendants,
 * scale horizontalement, et le timeout 120s gère même les images lourdes.
 */
class ProcessUploadedImageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;

    public function __construct(
        public string $modelClass,           // ex: 'App\Models\Sermon'
        public int    $modelId,
        public string $attribute,            // ex: 'thumbnail' ou 'cover_image'
        public string $tempPath,             // chemin du fichier original temp
        public string $targetDir,            // ex: 'sermons/thumbnails'
        public ?int   $maxWidth = 1920,      // null = pas de resize
        public ?int   $maxHeight = 1080,
        public string $fit = 'cover',        // cover | contain | scaleDown
        public int    $quality = 85,
        public ?string $oldPath = null,      // ancien path à nettoyer
    ) {}

    public function backoff(): array
    {
        return [30, 60, 120];
    }

    public function handle(): void
    {
        if (! is_subclass_of($this->modelClass, Model::class)) {
            Log::error('ProcessUploadedImageJob: classe invalide', ['class' => $this->modelClass]);
            $this->cleanupTemp();
            return;
        }

        /** @var Model|null $model */
        $model = $this->modelClass::find($this->modelId);
        if (! $model) {
            Log::warning('ProcessUploadedImageJob: modèle introuvable', [
                'class' => $this->modelClass, 'id' => $this->modelId,
            ]);
            $this->cleanupTemp();
            return;
        }

        $disk = Storage::disk(config('filesystems.default'));

        if (! $disk->exists($this->tempPath)) {
            Log::warning('ProcessUploadedImageJob: fichier temp introuvable', ['path' => $this->tempPath]);
            return;
        }

        // Lecture + traitement (Intervention Image v4 — decode + WebpEncoder).
        $contents = $disk->get($this->tempPath);
        $manager  = new ImageManager(new GdDriver());
        $image    = $manager->decode($contents);

        if ($this->maxWidth && $this->maxHeight) {
            match ($this->fit) {
                'cover'     => $image->cover($this->maxWidth, $this->maxHeight),
                'contain'   => $image->contain($this->maxWidth, $this->maxHeight),
                'scaleDown' => $image->scaleDown($this->maxWidth, $this->maxHeight),
                default     => $image->scaleDown($this->maxWidth, $this->maxHeight),
            };
        }

        $webp = (string) $image->encode(new WebpEncoder(quality: $this->quality));

        // Stockage final.
        $finalPath = sprintf(
            '%s/%s.webp',
            trim($this->targetDir, '/'),
            bin2hex(random_bytes(16))
        );
        $disk->put($finalPath, $webp, ['visibility' => 'public']);

        // Update modèle (sans event ni timestamps pour rester atomique).
        $this->modelClass::where('id', $this->modelId)->update([$this->attribute => $finalPath]);

        // Nettoyages.
        $this->cleanupOld($disk);
        $this->cleanupTemp($disk);

        Log::info('Image processed', [
            'class'      => $this->modelClass,
            'id'         => $this->modelId,
            'attribute'  => $this->attribute,
            'final_path' => $finalPath,
            'bytes'      => strlen($webp),
        ]);
    }

    protected function cleanupOld($disk): void
    {
        if (! $this->oldPath || str_starts_with($this->oldPath, 'http')) return;
        if ($disk->exists($this->oldPath)) {
            $disk->delete($this->oldPath);
        }
    }

    protected function cleanupTemp($disk = null): void
    {
        $disk = $disk ?: Storage::disk(config('filesystems.default'));
        if ($disk->exists($this->tempPath)) {
            $disk->delete($this->tempPath);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessUploadedImageJob: échec définitif', [
            'class' => $this->modelClass, 'id' => $this->modelId,
            'error' => $exception->getMessage(),
        ]);
        $this->cleanupTemp();
    }
}
