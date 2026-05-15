<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — 8 événements (4 passés, 4 à venir).
 */
class EventSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $admin = User::where('email', 'admin@newinechurch.org')->first();
        $createdBy = $admin?->id ?? 1;

        $events = [
            // === Événements passés ===
            ['title' => 'Culte d\'inauguration NWC', 'type' => 'culte',          'starts' => $now->copy()->subMonths(3),  'ends' => $now->copy()->subMonths(3)->addHours(3),  'location' => 'Cocody-Bonoumin, Abidjan'],
            ['title' => 'Conférence "Sauvé pour Sauver"', 'type' => 'formation', 'starts' => $now->copy()->subMonths(2),  'ends' => $now->copy()->subMonths(2)->addDays(2),    'location' => 'Salle de la Maison de la Destinée'],
            ['title' => 'Évangélisation grand quartier', 'type' => 'evangelisation', 'starts' => $now->copy()->subMonth(),  'ends' => $now->copy()->subMonth()->addHours(5),  'location' => 'Cocody Bonoumin'],
            ['title' => 'Concert d\'adoration "Hosanna"', 'type' => 'concert',  'starts' => $now->copy()->subWeeks(3),    'ends' => $now->copy()->subWeeks(3)->addHours(3),  'location' => 'Plateau Hexagone'],

            // === Événements à venir ===
            ['title' => 'Culte du dimanche',                'type' => 'culte',     'starts' => $now->copy()->next('Sunday')->setTime(13,0),       'ends' => $now->copy()->next('Sunday')->setTime(15,0), 'location' => 'NWC, Cocody-Bonoumin'],
            ['title' => 'Nuit de prière "Levée de l\'armée"', 'type' => 'priere',    'starts' => $now->copy()->addWeeks(2)->setTime(22,0),         'ends' => $now->copy()->addWeeks(2)->addDay()->setTime(5,0), 'location' => 'NWC, Cocody-Bonoumin'],
            ['title' => 'Formation des leaders de cellules','type' => 'formation', 'starts' => $now->copy()->addWeeks(3)->setTime(9,0),          'ends' => $now->copy()->addWeeks(3)->setTime(17,0), 'location' => 'NWC, salle de formation'],
            ['title' => 'Évangélisation Yopougon',          'type' => 'evangelisation','starts' => $now->copy()->addMonth()->setTime(8,0),        'ends' => $now->copy()->addMonth()->setTime(13,0), 'location' => 'Yopougon — marché central'],
        ];

        foreach ($events as $i => $e) {
            $slug = Str::slug($e['title']).'-'.($i + 1);
            DB::table('events')->updateOrInsert(
                ['slug' => $slug],
                [
                    'title' => $e['title'],
                    'slug' => $slug,
                    'description' => "Description détaillée de l'événement « {$e['title']} ». Plus d'informations bientôt.",
                    'type' => $e['type'],
                    'location' => $e['location'],
                    'address' => $e['location'],
                    'starts_at' => $e['starts'],
                    'ends_at' => $e['ends'],
                    'cover_image' => null,
                    'max_attendees' => $e['type'] === 'formation' ? 100 : null,
                    'registration_required' => $e['type'] === 'formation',
                    'registration_deadline' => $e['type'] === 'formation' ? $e['starts']->copy()->subDays(3) : null,
                    'is_online' => false,
                    'online_link' => null,
                    'is_featured' => $i >= 4,           // les 4 à venir mis en avant
                    'is_published' => true,
                    'created_by' => $createdBy,
                    'created_at' => $now->copy()->subDays(rand(10, 90)),
                    'updated_at' => $now,
                ]
            );
        }

        $this->command->info('  ✓ '.count($events).' événements créés (passés + à venir)');
    }
}
