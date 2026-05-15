<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — 8 cellules d'évangélisation avec leader + 4-8 membres chacune.
 *
 * Refonte Étape 1 :
 *  - meeting_day passe en lowercase (ENUM contraint).
 *  - Le leader reçoit le rôle "leader" (au lieu de "capitaine").
 *  - Flag is_cell_leader=true + cell_id = id de la cellule.
 *  - Le mandat historique est créé dans CellLeaderSeeder.
 */
class CellSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // Pool des utilisateurs disponibles (membres factices uniquement).
        $members = User::role('membre')
                       ->where('status', 'active')
                       ->get()
                       ->shuffle();

        if ($members->count() < 16) {
            $this->command->warn('  ⚠ Pas assez de membres actifs pour seeder les cellules (16 requis).');
            return;
        }

        $cells = [
            ['name' => 'Cellule Cocody Centre',   'zone' => 'Cocody Centre',   'day' => 'vendredi', 'time' => '19:00'],
            ['name' => 'Cellule Bonoumin',        'zone' => 'Bonoumin',         'day' => 'vendredi', 'time' => '19:30'],
            ['name' => 'Cellule Riviera',         'zone' => 'Riviera',          'day' => 'samedi',   'time' => '17:00'],
            ['name' => 'Cellule Angré',           'zone' => 'Angré',            'day' => 'vendredi', 'time' => '19:00'],
            ['name' => 'Cellule Plateau',         'zone' => 'Plateau',          'day' => 'mardi',    'time' => '18:30'],
            ['name' => 'Cellule Yopougon Centre', 'zone' => 'Yopougon',         'day' => 'samedi',   'time' => '17:00'],
            ['name' => 'Cellule Treichville',     'zone' => 'Treichville',      'day' => 'mercredi', 'time' => '19:00'],
            ['name' => 'Cellule Marcory',         'zone' => 'Marcory',          'day' => 'vendredi', 'time' => '19:00'],
        ];

        // On consomme les membres au fur et à mesure pour éviter les doublons.
        $idx = 0;

        foreach ($cells as $c) {
            // Garde-fou : si on a épuisé les membres dispo, on s'arrête proprement.
            if ($idx >= $members->count()) {
                $this->command->warn('  ⚠ Plus de membres disponibles, '.($idx).' cellules seedées seulement.');
                break;
            }
            $leader = $members[$idx++];
            // Le leader devient leader de cellule — rôle Spatie + flag user.
            $leader->syncRoles(['leader']);
            $leader->update([
                'is_cell_leader' => true,
            ]);

            $cellId = DB::table('cells')->insertGetId([
                'name'             => $c['name'],
                'slug'             => Str::slug($c['name']),
                'description'      => "Cellule d'évangélisation située à {$c['zone']}.",
                'leader_id'        => $leader->id, // cache du leader principal
                'zone'             => $c['zone'],
                'meeting_day'      => $c['day'],
                'meeting_time'     => $c['time'],
                'meeting_location' => "Domicile à {$c['zone']}",
                'target_size'      => 12,
                'whatsapp_link'    => null,
                'status'           => 'active',
                'is_active'        => true,
                'created_at'       => $now->copy()->subMonths(rand(2, 12)),
                'updated_at'       => $now,
            ]);

            // Sync cell_id sur le leader.
            $leader->update(['cell_id' => $cellId]);

            // Le leader lui-même est ajouté comme membre de sa cellule.
            DB::table('cell_user')->insertOrIgnore([
                'cell_id'    => $cellId,
                'user_id'    => $leader->id,
                'role'       => 'leader',
                'joined_at'  => $now->copy()->subMonths(6)->toDateString(),
                'is_convert' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 3 à 7 membres en plus.
            $count = rand(3, 7);
            for ($j = 0; $j < $count && $idx < $members->count(); $j++) {
                $member = $members[$idx++];
                DB::table('cell_user')->insertOrIgnore([
                    'cell_id'    => $cellId,
                    'user_id'    => $member->id,
                    'role'       => 'member',
                    'joined_at'  => $now->copy()->subDays(rand(30, 365))->toDateString(),
                    'is_convert' => rand(1, 100) > 70,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                // Cache cell_id sur le membre (sa cellule courante).
                $member->update(['cell_id' => $cellId]);
            }
        }

        $this->command->info('  ✓ '.count($cells).' cellules créées avec leader + membres');
    }
}
