<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeder — 50 membres factices avec des noms ivoiriens réalistes.
 *
 * Tous les utilisateurs partagent le mot de passe "Membre@NWC2025!"
 * pour faciliter les tests. À ne JAMAIS utiliser en production.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Pool de prénoms et noms ivoiriens / ouest-africains réalistes.
        $firstNames = [
            'Aminata', 'Fatim', 'Awa', 'Mariam', 'Aïcha', 'Adjoua', 'Akissi',
            'Yao', 'Kouamé', 'Konan', 'Kouadio', 'Kouassi', 'Yapi', 'Brou',
            'N\'guessan', 'Ouattara', 'Coulibaly', 'Diabaté', 'Doumbia', 'Cissé',
            'Esther', 'Grâce', 'Sarah', 'Ruth', 'Marie', 'Naomi', 'Hanna',
            'David', 'Joël', 'Samuel', 'Pierre', 'Paul', 'Jean', 'Daniel',
            'Béatrice', 'Patricia', 'Sandrine', 'Jocelyne', 'Yvette', 'Christelle',
            'Ange', 'Cédric', 'Patrick', 'Eric', 'Marc', 'Jonathan', 'Emmanuel',
            'Rachelle', 'Carine', 'Murielle', 'Florence',
        ];

        $lastNames = [
            'Kouassi', 'Konan', 'Yao', 'Kouadio', 'Kouamé', 'N\'guessan',
            'Adou', 'Diomandé', 'Bamba', 'Touré', 'Coulibaly', 'Ouattara',
            'Diabaté', 'Doumbia', 'Cissé', 'Sangaré', 'Bakayoko', 'Sylla',
            'Aké', 'Brou', 'Yapi', 'Tanoh', 'Mensah', 'Amani', 'Anoumou',
            'Boa', 'Bohoun', 'Kaké', 'Lagou', 'Mian', 'Toure', 'Asseu',
        ];

        $cities = ['Abidjan', 'Cocody', 'Yopougon', 'Treichville', 'Marcory', 'Plateau', 'Adjamé'];
        $genders = ['M', 'F'];

        $defaultPassword = Hash::make('Membre@NWC2025!');
        $createdEmails = [];

        for ($i = 1; $i <= 50; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName  = $lastNames[array_rand($lastNames)];

            // Email basé sur prénom.nom + index, en ASCII (évite accents/apostrophes).
            $base = Str::slug($firstName.'.'.$lastName, '.', 'fr');
            $email = $base.$i.'@nwc-test.org';

            // Évite les collisions d'email (contrainte unique).
            if (in_array($email, $createdEmails)) {
                $email = $base.uniqid().'@nwc-test.org';
            }
            $createdEmails[] = $email;

            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'name'              => $lastName,
                    'first_name'        => $firstName,
                    'password'          => $defaultPassword,
                    'phone'             => '+225 0'.rand(1, 9).' '.rand(10,99).' '.rand(10,99).' '.rand(10,99).' '.rand(10,99),
                    'gender'            => $genders[array_rand($genders)],
                    'city'              => $cities[array_rand($cities)],
                    'address'           => 'Quartier '.['Bonoumin','Riviera','Angré','Cocody Centre'][array_rand([0,1,2,3])],
                    'birth_date'        => now()->subYears(rand(18, 45))->subDays(rand(0, 365))->toDateString(),
                    'status'            => rand(1, 100) > 15 ? 'active' : 'pending',
                    'is_baptized'       => rand(0, 1) === 1,
                    'joined_at'         => now()->subMonths(rand(1, 36))->toDateString(),
                    'email_verified_at' => now(),
                ]
            );

            // Tous les membres factices reçoivent le rôle "membre".
            $user->syncRoles(['membre']);
        }

        $this->command->info('  ✓ 50 membres factices créés (mdp: Membre@NWC2025!)');
    }
}
