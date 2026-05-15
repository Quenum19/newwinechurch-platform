<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;

/**
 * Job : optimisation et conversion d'un avatar uploadé.
 *
 * Étapes :
 *  1. Lit le fichier original (chemin temporaire stocké pendant l'upload)
 *  2. Redimensionne à 512×512 max (cover, ratio préservé)
 *  3. Convertit en WebP qualité 82 (≈ 50-100 Ko)
 *  4. Strip EXIF (anti-doxing : géoloc, modèle d'appareil, etc.)
 *  5. Stocke à `avatars/<user_id>/<random>.webp` sur le disque public
 *  6. Met à jour User->avatar (chemin relatif)
 *  7. Supprime l'ancien avatar si existant (économie stockage)
 *  8. Supprime le fichier original temporaire
 *
 * Le job est resilient : tries=3, backoff 30s+, et logge en cas d'échec.
 */
class ProcessAvatarJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Nombre de tentatives en cas d'échec (image corrompue, OOM, etc.). */
    public int $tries = 3;

    /** Backoff progressif en secondes : 30s → 60s → 120s. */
    public int $timeout = 120;

    public function __construct(
        public int $userId,
        public string $tempPath,        // ex: tmp-uploads/abc.jpg sur disque public
        public ?string $oldAvatarPath = null,
    ) {}

    /** Backoff progressif. */
    public function backoff(): array
    {
        return [30, 60, 120];
    }

    public function handle(): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            Log::warning('ProcessAvatarJob: user introuvable', ['user_id' => $this->userId]);
            $this->cleanupTemp();
            return;
        }

        $disk = Storage::disk(config('filesystems.default'));

        if (! $disk->exists($this->tempPath)) {
            Log::warning('ProcessAvatarJob: fichier temporaire introuvable', ['path' => $this->tempPath]);
            return;
        }

        // === Lecture & traitement image ===
        $contents = $disk->get($this->tempPath);
        $image = Image::read($contents);

        // Redimensionnement intelligent : on couvre 512x512 sans déformer.
        $image->cover(512, 512);

        // Conversion WebP (qualité 82 → bon compromis taille/qualité).
        // Intervention Image strippe EXIF par défaut lors du ré-encodage.
        $webp = (string) $image->toWebp(82);

        // Chemin final : avatars/<user_id>/<32 chars random>.webp
        $finalPath = sprintf(
            'avatars/%d/%s.webp',
            $user->id,
            bin2hex(random_bytes(16))
        );

        $disk->put($finalPath, $webp, ['visibility' => 'public']);

        // === Mise à jour user (sans déclencher d'event) ===
        User::where('id', $user->id)->update(['avatar' => $finalPath]);

        // === Cleanup ===
        $this->cleanupOldAvatar($disk);
        $this->cleanupTemp($disk);

        Log::info('Avatar processed', [
            'user_id'     => $user->id,
            'final_path'  => $finalPath,
            'size_bytes'  => strlen($webp),
        ]);
    }

    /** Suppression de l'ancien avatar si présent (économie stockage). */
    protected function cleanupOldAvatar($disk): void
    {
        if (! $this->oldAvatarPath || str_starts_with($this->oldAvatarPath, 'http')) {
            return; // pas d'ancien, ou ancien externe (S3 d'un tiers) → on touche pas
        }
        if ($disk->exists($this->oldAvatarPath)) {
            $disk->delete($this->oldAvatarPath);
        }
    }

    /** Suppression du fichier temporaire d'upload. */
    protected function cleanupTemp($disk = null): void
    {
        $disk = $disk ?: Storage::disk(config('filesystems.default'));
        if ($disk->exists($this->tempPath)) {
            $disk->delete($this->tempPath);
        }
    }

    /** Appelé si toutes les tentatives échouent. On nettoie le fichier temporaire. */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessAvatarJob: échec définitif', [
            'user_id' => $this->userId,
            'error'   => $exception->getMessage(),
        ]);
        $this->cleanupTemp();
    }
}
