<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Event;
use Illuminate\Database\Seeder;

/**
 * Seeder — Étape 5 : rattache aléatoirement chaque événement à 1-3 départements
 * actifs (pivot event_department). Permet à la page publique d'un département
 * d'afficher ses prochains événements.
 */
class EventDepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $events = Event::all();
        $activeDepts = Department::where('status', 'active')->pluck('id')->all();

        if (empty($activeDepts) || $events->isEmpty()) {
            $this->command->warn('  ⚠ EventDepartmentSeeder ignoré (pas d\'événements ou départements actifs).');
            return;
        }

        $count = 0;
        foreach ($events as $event) {
            // 1 à 3 départements rattachés (random).
            $n = rand(1, 3);
            $picks = array_rand(array_flip($activeDepts), min($n, count($activeDepts)));
            $picks = is_array($picks) ? $picks : [$picks];
            $event->departments()->syncWithoutDetaching($picks);
            $count += count($picks);
        }

        $this->command->info("  ✓ {$count} liens événement-département seedés.");
    }
}
