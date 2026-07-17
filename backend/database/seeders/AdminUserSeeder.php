<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder — Comptes admin/pasteur/rh/controleur de démarrage.
 *
 * IDEMPOTENT et SÛR en prod :
 *  - Si le compte existe DÉJÀ : on ne touche RIEN (mdp préservé, rôles préservés)
 *  - Si le compte n'existe PAS : on le crée avec les valeurs ci-dessous
 *
 * Garantie : impossible d'écraser un mdp admin déjà personnalisé en prod.
 * Mots de passe par défaut (UNIQUEMENT pour création initiale) :
 *  - Admin@NWC2025! / Pasteur@NWC2025! / Rh@NWC2025! / Controleur@NWC2025!
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'email'   => 'admin@newinechurch.org',
                'role'    => 'superadmin',
                'fields'  => [
                    'name'              => 'Administrateur',
                    'first_name'        => 'Super',
                    'password'          => Hash::make('Admin@NWC2025!'),
                    'phone'             => '+225 07 00 00 00 00',
                    'status'            => 'active',
                    'is_baptized'       => true,
                    'joined_at'         => '2025-01-01',
                    'email_verified_at' => now(),
                ],
                'label' => 'admin@newinechurch.org (superadmin) — mdp: Admin@NWC2025!',
            ],
            [
                'email'   => 'pasteur@newinechurch.org',
                'role'    => 'pasteur',
                'fields'  => [
                    'name'              => 'Amoako-Prempeh',
                    'first_name'        => 'Georges',
                    'password'          => Hash::make('Pasteur@NWC2025!'),
                    'phone'             => '+225 07 11 11 11 11',
                    'city'              => 'Abidjan',
                    'address'           => 'Cocody-Bonoumin',
                    'status'            => 'active',
                    'is_baptized'       => true,
                    'joined_at'         => '2024-06-01',
                    'email_verified_at' => now(),
                ],
                'label' => 'pasteur@newinechurch.org (pasteur) — mdp: Pasteur@NWC2025!',
            ],
            [
                'email'   => 'rh@newinechurch.org',
                'role'    => 'rh',
                'fields'  => [
                    'name'              => 'KOFFI',
                    'first_name'        => 'Esther',
                    'password'          => Hash::make('Rh@NWC2025!'),
                    'phone'             => '+225 07 22 22 22 22',
                    'city'              => 'Abidjan',
                    'status'            => 'active',
                    'is_baptized'       => true,
                    'joined_at'         => '2024-09-01',
                    'email_verified_at' => now(),
                ],
                'label' => 'rh@newinechurch.org (rh) — mdp: Rh@NWC2025!',
            ],
            [
                'email'   => 'controleur@newinechurch.org',
                'role'    => 'controleur',
                'fields'  => [
                    'name'              => 'Contrôleur Sécurité',
                    'first_name'        => 'Sécurité',
                    'password'          => Hash::make('Controleur@NWC2025!'),
                    'phone'             => '+225 07 33 33 33 33',
                    'status'            => 'active',
                    'is_baptized'       => true,
                    'joined_at'         => '2026-06-01',
                    'email_verified_at' => now(),
                ],
                'label' => 'controleur@newinechurch.org (controleur) — mdp: Controleur@NWC2025!',
            ],
        ];

        foreach ($accounts as $account) {
            // firstOrCreate : si l'email existe, retourne le user EXISTANT sans rien modifier.
            // Sinon le crée avec les valeurs $fields.
            $existed = User::where('email', $account['email'])->exists();
            $user = User::firstOrCreate(['email' => $account['email']], $account['fields']);

            // On affecte le rôle dans tous les cas (au cas où il manquerait, ex: après reset perms).
            // syncRoles est idempotent : pas de doublon.
            if (! $user->hasRole($account['role'])) {
                $user->assignRole($account['role']);
            }

            $verb = $existed ? '· (existant, préservé)' : '✓ créé';
            $this->command->info("  {$verb} {$account['label']}");
        }
    }
}
