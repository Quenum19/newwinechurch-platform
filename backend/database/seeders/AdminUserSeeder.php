<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder — Compte superadmin par défaut.
 *
 * /!\ Mot de passe à changer immédiatement en production.
 * Identifiants : admin@newinechurch.org / Admin@NWC2025!
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@newinechurch.org'],
            [
                'name'             => 'Administrateur',
                'first_name'       => 'Super',
                'password'         => Hash::make('Admin@NWC2025!'),
                'phone'            => '+225 07 00 00 00 00',
                'status'           => 'active',
                'is_baptized'      => true,
                'joined_at'        => '2025-01-01',
                'email_verified_at'=> now(),
            ]
        );

        // Affecte le rôle superadmin (créé par RolesAndPermissionsSeeder).
        $admin->syncRoles(['superadmin']);

        // Crée également un compte pasteur de démo.
        $pasteur = User::updateOrCreate(
            ['email' => 'pasteur@newinechurch.org'],
            [
                'name'             => 'Amoako-Prempeh',
                'first_name'       => 'Georges',
                'password'         => Hash::make('Pasteur@NWC2025!'),
                'phone'            => '+225 07 11 11 11 11',
                'city'             => 'Abidjan',
                'address'          => 'Cocody-Bonoumin',
                'status'           => 'active',
                'is_baptized'      => true,
                'joined_at'        => '2024-06-01',
                'email_verified_at'=> now(),
            ]
        );
        $pasteur->syncRoles(['pasteur']);

        // Compte RH de démo (reçoit les rapports département en lecture).
        $rh = User::updateOrCreate(
            ['email' => 'rh@newinechurch.org'],
            [
                'name'             => 'KOFFI',
                'first_name'       => 'Esther',
                'password'         => Hash::make('Rh@NWC2025!'),
                'phone'            => '+225 07 22 22 22 22',
                'city'             => 'Abidjan',
                'status'           => 'active',
                'is_baptized'      => true,
                'joined_at'        => '2024-09-01',
                'email_verified_at'=> now(),
            ]
        );
        $rh->syncRoles(['rh']);

        $this->command->info('  ✓ admin@newinechurch.org (superadmin) — mdp: Admin@NWC2025!');
        $this->command->info('  ✓ pasteur@newinechurch.org (pasteur) — mdp: Pasteur@NWC2025!');
        $this->command->info('  ✓ rh@newinechurch.org (rh) — mdp: Rh@NWC2025!');
    }
}
