<?php

namespace Database\Seeders;

use App\Models\EventSeries;
use App\Models\User;
use App\Services\EventSeriesGenerator;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Phase 5 — Série démo "Cycle Discipulat" (4 samedis consécutifs).
 *
 * Idempotent : si la série existe, on ne touche pas (mais on signale).
 */
class CycleDiscipulatSeeder extends Seeder
{
    public function run(): void
    {
        $slug = 'cycle-discipulat-2026';

        if (EventSeries::where('slug', $slug)->exists()) {
            $this->command?->info('  · Série "Cycle Discipulat" déjà présente — skip.');
            return;
        }

        $creatorId = User::role(['superadmin', 'admin'])->value('id') ?? User::first()?->id;

        $series = EventSeries::create([
            'title'                    => 'Cycle Discipulat',
            'slug'                     => $slug,
            'description'              => "Formation en 4 samedis pour grandir dans la connaissance des fondements bibliques du discipulat.\n\nChaque session aborde un thème : identité en Christ, vie de prière, étude de la Parole, témoignage.",
            'recurrence_type'          => 'weekly',
            'recurrence_day'           => 6, // samedi
            'default_start_time'       => '15:00',
            'default_duration_minutes' => 180,
            'default_location'         => 'Salle de formation NWC',
            'default_address'          => 'Cocody-Bonoumin, Abidjan',
            'is_published'             => true,
            'created_by'               => $creatorId,
        ]);

        // Génère 4 occurrences à partir du prochain samedi.
        $next = now()->copy()->next(Carbon::SATURDAY);
        app(EventSeriesGenerator::class)->generate(
            series: $series,
            startDate: $next,
            count: 4,
            creatorId: $creatorId,
        );

        $this->command?->info('  ✓ Série "Cycle Discipulat" créée (4 occurrences).');
        $this->command?->info('  → URL publique : /billetterie/serie/' . $slug);
    }
}
