<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\EventTicketType;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Event de démonstration pour la Phase 1 billetterie.
 *
 * Idempotent : si le slug "a-dark-night-in-elegance" existe déjà, on ne touche pas.
 * Tu peux directement créer une réservation depuis /billetterie/a-dark-night-in-elegance.
 */
class DarkNightEventSeeder extends Seeder
{
    public function run(): void
    {
        $slug = 'a-dark-night-in-elegance';

        $existing = Event::where('slug', $slug)->first();
        if ($existing) {
            $this->command?->info('  · Event "A Dark Night in Elegance" déjà présent — vérification types.');
            $this->seedTicketTypes($existing);
            return;
        }

        // L'event a besoin d'un créateur — on prend l'admin par défaut.
        $creatorId = User::role(['superadmin', 'admin'])->value('id')
                  ?? User::first()?->id;

        $event = Event::create([
            'created_by'           => $creatorId,
            'title'                => 'A Dark Night in Elegance',
            'slug'                 => $slug,
            'description'          => "Une nuit de prestige, d'élégance et de souvenirs inoubliables.\n\nNew Wine vous invite à son bal annuel : Élégance · Partage · Souvenirs.\n\nDress code : tenue de soirée stricte. Soyons au rendez-vous !",
            'type'                 => 'autre',
            'location'             => 'La Maison de la Destinée',
            'address'              => 'Riviera Bonoumin, Rue 65, Abidjan',
            'starts_at'            => now()->copy()->addMonth()->setTime(18, 0),
            'ends_at'              => now()->copy()->addMonth()->setTime(23, 59),
            'cover_image'          => null,
            'is_published'         => true,
            'is_featured'          => true,
            // Inscription standard (pré-existant)
            'registration_required'=> true,
            'max_attendees'        => 300,
            // Billetterie (nouveau)
            'ticketing_enabled'    => true,
            'tickets_per_email_max'=> 3,
            'tickets_capacity'     => 300,
            'tickets_closes_at'    => now()->copy()->addMonth()->subDay()->setTime(23, 59),
            'require_selfie'       => false,
            'allow_waitlist'       => true,
            'support_phone'        => '+225 07 00 00 00 00',
        ]);

        $this->command?->info('  ✓ Event "A Dark Night in Elegance" créé (id ' . $event->id . ').');
        $this->seedTicketTypes($event);
        $this->command?->info('  → URL publique : /billetterie/' . $slug);
    }

    /** Crée les 3 types de démo (idempotent — utilisable au reset comme à la création). */
    private function seedTicketTypes(Event $event): void
    {
        EventTicketType::firstOrCreate(
            ['event_id' => $event->id, 'slug' => 'standard'],
            [
                'name'        => 'Standard',
                'description' => 'Accès soirée + buffet partagé',
                'price_fcfa'  => 5000,
                'capacity'    => 200,
                'sort_order'  => 1,
                'color_hex'   => '#C9A961',
                'max_per_order' => 5,
            ]
        );
        EventTicketType::firstOrCreate(
            ['event_id' => $event->id, 'slug' => 'vip'],
            [
                'name'        => 'VIP',
                'description' => 'Cocktail de bienvenue + place réservée + photo officielle',
                'price_fcfa'  => 15000,
                'capacity'    => 50,
                'sort_order'  => 2,
                'color_hex'   => '#8B1A2F',
                'max_per_order' => 3,
            ]
        );
        EventTicketType::firstOrCreate(
            ['event_id' => $event->id, 'slug' => 'benevole'],
            [
                'name'        => 'Bénévole',
                'description' => 'Pour l\'équipe organisation (gratuit, sur invitation)',
                'price_fcfa'  => 0,
                'capacity'    => 30,
                'sort_order'  => 3,
                'color_hex'   => '#0A0908',
            ]
        );
        $this->command?->info('  ✓ Types : Standard (5 000 FCFA) · VIP (15 000) · Bénévole (gratuit)');
    }
}
