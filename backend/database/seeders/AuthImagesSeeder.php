<?php

namespace Database\Seeders;

use App\Models\AuthImage;
use Illuminate\Database\Seeder;

/**
 * Seeder — Images de fond pour les pages auth (connexion/inscription).
 * Le superadmin pourra ensuite ajouter/supprimer via /admin/images-auth.
 */
class AuthImagesSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'title'      => 'Adoration',
                'path'       => 'auth-hero/hero-1.jpg',
                'verse_ref'  => 'Matthieu 5:13-14',
                'verse_text' => "Vous êtes le sel de la terre.\nVous êtes la lumière du monde.",
                'sort_order' => 1,
            ],
            [
                'title'      => 'Communauté',
                'path'       => 'auth-hero/hero-2.jpg',
                'verse_ref'  => 'Psaume 133:1',
                'verse_text' => "Voici, oh ! qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble !",
                'sort_order' => 2,
            ],
        ];

        foreach ($items as $i) {
            AuthImage::updateOrCreate(['path' => $i['path']], $i + ['is_active' => true]);
        }

        $this->command->info('  ✓ '.count($items).' images auth seedées');
    }
}
