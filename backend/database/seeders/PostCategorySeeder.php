<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — Catégories d'articles de blog.
 */
class PostCategorySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $categories = [
            ['name' => 'Enseignements',    'name_en' => 'Teachings',    'color' => '#8B1A2F'],
            ['name' => 'Témoignages',      'name_en' => 'Testimonies',  'color' => '#C9A84C'],
            ['name' => 'Annonces',         'name_en' => 'Announcements','color' => '#B22240'],
            ['name' => "Vie de l'Église",  'name_en' => 'Church Life',  'color' => '#7E662E'],
            ['name' => 'Inspiration',      'name_en' => 'Inspiration',  'color' => '#9D2A47'],
        ];

        foreach ($categories as $cat) {
            DB::table('post_categories')->updateOrInsert(
                ['slug' => Str::slug($cat['name'])],
                array_merge($cat, [
                    'slug' => Str::slug($cat['name']),
                    'created_at' => $now, 'updated_at' => $now,
                ])
            );
        }

        $this->command->info('  ✓ '.count($categories).' catégories blog créées');
    }
}
