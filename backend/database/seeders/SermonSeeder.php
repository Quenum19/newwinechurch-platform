<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — 20 sermons fictifs distribués sur les 6 derniers mois.
 *
 * Speaker : pasteur principal (récupéré par email).
 */
class SermonSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $pasteur = User::where('email', 'pasteur@newinechurch.org')->first();
        $speakerId = $pasteur?->id;

        $seriesIds = DB::table('sermon_series')->pluck('id')->all();

        $titles = [
            ['Le Royaume des cieux est proche', 'Matthieu 4:17'],
            ['L\'identité du fils de Dieu', 'Romains 8:14-17'],
            ['L\'armure de Dieu', 'Éphésiens 6:10-18'],
            ['Sauvé pour Sauver — Le mandat évangélique', 'Marc 16:15'],
            ['La puissance du Saint-Esprit', 'Actes 1:8'],
            ['Le secret de la prière', 'Matthieu 6:5-15'],
            ['Foi qui déplace les montagnes', 'Matthieu 17:20'],
            ['L\'audace des premiers apôtres', 'Actes 4:13'],
            ['Vivre par la grâce', 'Tite 2:11-14'],
            ['Le combat spirituel', '2 Corinthiens 10:3-5'],
            ['L\'amour comme commandement', 'Jean 13:34-35'],
            ['Le don de soi', 'Romains 12:1-2'],
            ['La sainteté pratique', '1 Pierre 1:13-16'],
            ['L\'unité du corps', 'Éphésiens 4:1-6'],
            ['Le service comme adoration', 'Romains 12:11'],
            ['La louange qui transforme', 'Psaume 22:3'],
            ['Le jeûne et ses bénédictions', 'Ésaïe 58:6-9'],
            ['Renouveler son intelligence', 'Romains 12:2'],
            ['L\'autorité du croyant', 'Luc 10:19'],
            ['Vivre par la Parole', 'Matthieu 4:4'],
        ];

        foreach ($titles as $i => [$title, $verse]) {
            $slug = Str::slug($title);
            $sermonDate = now()->subDays(($i + 1) * 7);
            DB::table('sermons')->updateOrInsert(
                ['slug' => $slug],
                [
                    'title' => $title,
                    'slug' => $slug,
                    'description' => "Un message puissant prêché lors du culte du dimanche. Découvrez la vérité de la Parole sur ce thème : « {$title} ».",
                    'speaker_id' => $speakerId,
                    'series_id' => $seriesIds ? $seriesIds[array_rand($seriesIds)] : null,
                    'scripture_reference' => $verse,
                    'sermon_date' => $sermonDate->toDateString(),
                    'type' => $i % 3 === 0 ? 'audio' : 'video',
                    'video_url' => null,
                    'audio_url' => null,
                    'youtube_url' => null,
                    'thumbnail' => null,
                    'duration_seconds' => rand(1800, 4500), // 30 à 75 min
                    'views_count' => rand(50, 5000),
                    'is_featured' => $i < 3,                 // 3 premiers en avant
                    'is_published' => true,
                    'published_at' => $sermonDate,
                    'created_at' => $sermonDate,
                    'updated_at' => $now,
                ]
            );
        }

        $this->command->info('  ✓ 20 sermons fictifs créés');
    }
}
