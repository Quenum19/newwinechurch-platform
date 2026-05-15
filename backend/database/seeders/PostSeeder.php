<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — 10 articles de blog publiés.
 */
class PostSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $admin = User::where('email', 'admin@newinechurch.org')->first();
        $authorId = $admin?->id ?? 1;
        $categoryIds = DB::table('post_categories')->pluck('id')->all();

        $posts = [
            ['title' => 'Bienvenue sur le nouveau site de New Wine Church',         'excerpt' => 'Découvrez notre nouvelle plateforme web : sermons en replay, cellules, événements et bien plus.'],
            ['title' => 'Témoignage : "Dieu m\'a rencontré dans le bus"',           'excerpt' => 'Le récit puissant d\'une jeune sœur dont la vie a basculé après une rencontre avec Christ.'],
            ['title' => '5 versets pour traverser une saison difficile',             'excerpt' => 'Quand tout semble bouché, ces passages bibliques peuvent rallumer ta foi.'],
            ['title' => 'Pourquoi rejoindre une cellule change ta vie',              'excerpt' => 'Au-delà du dimanche, la cellule est un terrain de croissance spirituelle inégalable.'],
            ['title' => 'Compte-rendu : Conférence "Sauvé pour Sauver" 2025',        'excerpt' => 'Trois jours intenses de formation, prière et évangélisation. Voici ce qu\'il faut retenir.'],
            ['title' => 'L\'identité du fils de Dieu : qu\'est-ce que cela change ?',  'excerpt' => 'Comprendre qui tu es en Christ transforme radicalement ta façon de vivre.'],
            ['title' => 'Le secret d\'une vie de prière constante',                  'excerpt' => 'Trois clés pratiques pour bâtir une intimité durable avec le Seigneur.'],
            ['title' => 'Évangélisation : sortir des murs de l\'église',             'excerpt' => 'Notre récit de la dernière sortie d\'évangélisation à Cocody-Bonoumin.'],
            ['title' => 'Comment gérer ses finances en chrétien',                    'excerpt' => 'Les principes bibliques de gestion appliqués à la réalité ivoirienne.'],
            ['title' => 'Annonce : Nuit de prière "Levée de l\'armée" — date confirmée', 'excerpt' => 'Rendez-vous le mois prochain pour une nuit historique de prière et d\'engagement.'],
        ];

        foreach ($posts as $i => $p) {
            $slug = Str::slug($p['title']);
            DB::table('posts')->updateOrInsert(
                ['slug' => $slug],
                [
                    'title' => $p['title'],
                    'slug' => $slug,
                    'excerpt' => $p['excerpt'],
                    'content' => "<p>{$p['excerpt']}</p>\n<p>Cet article sera développé prochainement. La rédaction est en cours.</p>",
                    'cover_image' => null,
                    'author_id' => $authorId,
                    'category_id' => $categoryIds ? $categoryIds[array_rand($categoryIds)] : null,
                    'status' => 'published',
                    'is_featured' => $i < 2,
                    'published_at' => $now->copy()->subDays($i * 5),
                    'views_count' => rand(20, 1500),
                    'created_at' => $now->copy()->subDays($i * 5 + 1),
                    'updated_at' => $now,
                ]
            );
        }

        $this->command->info('  ✓ '.count($posts).' articles de blog publiés');
    }
}
