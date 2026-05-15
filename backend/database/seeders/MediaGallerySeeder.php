<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\MediaGallery;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — médias galerie publique avec rattachement département.
 *
 * Crée ~5 médias par département actif (mix photos + 1 vidéo factice par dept).
 * Utilise picsum.photos (CDN d'images de placeholder) pour le file_path —
 * permet à la galerie filtrée et au hero du DepartmentDetail public d'avoir
 * des images réelles sans nécessiter d'upload manuel.
 *
 * Le filtre `?department=slug` sur /api/media doit retourner ces médias.
 */
class MediaGallerySeeder extends Seeder
{
    public function run(): void
    {
        $depts = Department::where('status', 'active')->get();
        if ($depts->isEmpty()) {
            $this->command->warn('  ⚠ MediaGallerySeeder ignoré (pas de département actif).');
            return;
        }

        $uploader = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['superadmin', 'admin']))
                        ->first()
                        ?? User::first();
        if (! $uploader) {
            $this->command->warn('  ⚠ MediaGallerySeeder ignoré (pas d\'utilisateur uploader disponible).');
            return;
        }

        $now = now();
        $rows = [];
        $count = 0;

        foreach ($depts as $dept) {
            // 4-6 photos par département (placeholders Lorem Picsum).
            $photoCount = rand(4, 6);
            for ($i = 1; $i <= $photoCount; $i++) {
                // Picsum : seed unique par dept+i, dimensions 1200x800.
                $seed = "{$dept->slug}-{$i}";
                $rows[] = [
                    'title'         => null,
                    'description'   => null,
                    // URL HTTPS directe (le frontend gère str_starts_with('http')).
                    'file_path'     => "https://picsum.photos/seed/{$seed}/1200/800",
                    'file_type'     => 'image',
                    'file_size'     => null,
                    'thumbnail'     => null,
                    'event_id'      => null,
                    'department_id' => $dept->id,
                    'uploaded_by'   => $uploader->id,
                    'is_published'  => true,
                    'is_featured'   => $i === 1, // la première = featured
                    'sort_order'    => $i,
                    'created_at'    => $now->copy()->subDays(rand(1, 90)),
                    'updated_at'    => $now,
                ];
                $count++;
            }
        }

        // Bulk insert (les URLs externes évitent toute opération disque).
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('media_gallery')->insert($chunk);
        }

        $this->command->info("  ✓ {$count} médias galerie seedés (rattachés à {$depts->count()} départements)");
    }
}
