<?php

namespace App\Console\Commands;

use App\Models\BalPhoto;
use App\Models\Event;
use App\Services\BalPhotoComposer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Régénère les 4 formats cadrés (tv / paysage / carré / story) des photos
 * d'un event à partir de l'original, avec les brand_frames ACTUELS de l'event.
 *
 * Utile quand on change le cadre d'un event après que des photos ont déjà été
 * envoyées : ces photos avaient été pré-composées à l'upload avec l'ancien cadre.
 *
 *   php artisan gallery:recompose --event=festi-grill-26
 *   php artisan gallery:recompose --event=festi-grill-26 --dry-run
 *
 * Sûr : l'original (colonne path) n'est jamais modifié. Pour chaque photo, les
 * anciens fichiers cadrés ne sont supprimés qu'une fois les 4 nouveaux écrits.
 * Rejouable sans risque (chaque passage repart de l'original).
 */
class RecomposeGalleryCommand extends Command
{
    protected $signature = 'gallery:recompose
                            {--event= : Slug de l\'event}
                            {--event-id= : ID de l\'event (alternative au slug)}
                            {--dry-run : Liste les photos concernées sans rien modifier}';

    protected $description = 'Régénère les formats cadrés des photos d\'un event avec son cadre actuel.';

    /** colonne DB => [format composer, préfixe fichier] (mêmes préfixes qu'à l'upload) */
    private const FORMATS = [
        'tv_path'        => ['tv',        'tv_'],
        'landscape_path' => ['landscape', 'l_'],
        'square_path'    => ['square',    's_'],
        'story_path'     => ['story',     't_'],
    ];

    public function handle(BalPhotoComposer $composer): int
    {
        $event = $this->option('event-id')
            ? Event::find((int) $this->option('event-id'))
            : Event::where('slug', (string) $this->option('event'))->first();

        if (! $event) {
            $this->error('Event introuvable. Passe --event=<slug> ou --event-id=<n>.');
            return self::INVALID;
        }

        $frames = is_array($event->brand_frames) ? $event->brand_frames : [];
        $this->info("Event #{$event->id} — {$event->title}");
        $this->line('Cadres : ' . ($frames ? implode(', ', $frames) : 'aucun (cadre par défaut)'));

        $disk  = Storage::disk('public');
        $query = BalPhoto::where('event_id', $event->id)->whereNotNull('path');
        $total = $query->count();
        $this->info("Photos : {$total}");

        if ($total === 0 || $this->option('dry-run')) {
            return self::SUCCESS;
        }

        $ok = 0; $failed = 0;
        $bar = $this->output->createProgressBar($total);

        $query->orderBy('id')->chunkById(25, function ($photos) use ($composer, $event, $disk, &$ok, &$failed, $bar) {
            foreach ($photos as $photo) {
                $bar->advance();

                if (! $disk->exists($photo->path)) {
                    $failed++;
                    continue;
                }
                $absOriginal = $disk->path($photo->path);

                // 1. Compose et écrit les 4 nouveaux fichiers
                $new = [];
                foreach (self::FORMATS as $column => [$format, $prefix]) {
                    $binary = $composer->composeFormat($absOriginal, $format, $event);
                    if (! $binary) break;
                    $newPath = 'bal-photos/branded/' . $prefix . uniqid() . '.jpg';
                    $disk->put($newPath, $binary);
                    $new[$column] = $newPath;
                }

                // Échec partiel : on nettoie ce qu'on vient d'écrire, l'ancien reste en place
                if (count($new) !== count(self::FORMATS)) {
                    $disk->delete(array_values($new));
                    $failed++;
                    continue;
                }

                // 2. Bascule en base, puis supprime les anciens fichiers cadrés
                $old = array_filter($photo->only(array_keys(self::FORMATS)));
                $photo->update($new);
                $disk->delete(array_values(array_diff($old, [$photo->path])));
                $ok++;
            }
        });

        $bar->finish();
        $this->newLine(2);
        $this->info("Recomposées : {$ok} · échecs : {$failed}");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
