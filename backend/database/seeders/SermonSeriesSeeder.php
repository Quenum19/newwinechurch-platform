<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — 5 séries de sermons.
 */
class SermonSeriesSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $series = [
            ['title' => 'Identité dans Christ',          'desc' => 'Découvrir qui nous sommes en Jésus-Christ et marcher dans la pleine identité de fils et filles du Père.', 'started' => now()->subMonths(6), 'ended' => now()->subMonths(5), 'active' => false],
            ['title' => 'L\'armée de Dieu',               'desc' => 'Une série puissante sur le combat spirituel et la victoire en Christ.', 'started' => now()->subMonths(4), 'ended' => now()->subMonths(3), 'active' => false],
            ['title' => 'Sauvé pour Sauver',              'desc' => 'Notre raison d\'être : être un instrument de salut pour cette génération.', 'started' => now()->subMonths(2), 'ended' => null, 'active' => true],
            ['title' => 'Le Royaume avant tout',         'desc' => 'Comment vivre les valeurs du Royaume au quotidien.', 'started' => now()->subMonth(), 'ended' => null, 'active' => true],
            ['title' => 'Foi et Audace',                  'desc' => 'Marcher dans la foi audacieuse qui plaît à Dieu.', 'started' => now()->subWeeks(2), 'ended' => null, 'active' => true],
        ];

        foreach ($series as $s) {
            DB::table('sermon_series')->updateOrInsert(
                ['slug' => Str::slug($s['title'])],
                [
                    'title' => $s['title'],
                    'slug' => Str::slug($s['title']),
                    'description' => $s['desc'],
                    'cover_image' => null,
                    'started_at' => $s['started']?->toDateString(),
                    'ended_at' => $s['ended']?->toDateString(),
                    'is_active' => $s['active'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $this->command->info('  ✓ '.count($series).' séries de sermons créées');
    }
}
