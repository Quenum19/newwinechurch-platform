<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — distribue les membres dans plusieurs départements via le pivot
 * department_user, indépendamment du cache department_id.
 *
 *  - Les membres simples sans dept reçoivent un dept primaire + pivot.
 *  - Tous les membres actifs sont aussi répartis dans ~1-2 autres dépts via
 *    le pivot (un user peut servir dans plusieurs départements), pour que
 *    chaque dept ait au moins 3-6 membres visibles côté gouverneur.
 *  - Met à jour le cache departments.member_count_cache.
 */
class MemberDepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $depts = Department::where('status', 'active')->get();
        if ($depts->isEmpty()) {
            $this->command->warn('  ⚠ MemberDepartmentSeeder ignoré (pas de département actif).');
            return;
        }

        $allActiveMembers = User::role('membre')->where('status', 'active')->get();
        $now = now();
        $primaryAssigned = 0;
        $pivotAssigned = 0;

        // === 1) Assignation primaire (department_id) pour les membres sans dept ===
        foreach ($allActiveMembers as $member) {
            if (! $member->department_id) {
                $dept = $depts->random();
                $member->update(['department_id' => $dept->id]);
                DB::table('department_user')->updateOrInsert(
                    ['department_id' => $dept->id, 'user_id' => $member->id],
                    [
                        'role'       => 'member',
                        'joined_at'  => $now->copy()->subDays(rand(30, 365))->toDateString(),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
                $primaryAssigned++;
            }
        }

        // === 2) Distribution pivot multi-dépt (1-2 dépts supplémentaires par membre) ===
        // Permet à chaque département d'avoir un volume réaliste de membres
        // sans casser le cache department_id (qui reste l'appartenance principale).
        foreach ($allActiveMembers->merge(
            User::role('gouverneur')->where('status', 'active')->get()
        ) as $member) {
            $extraCount = rand(1, 2);
            $extras = $depts->where('id', '!=', $member->department_id)->shuffle()->take($extraCount);
            foreach ($extras as $dept) {
                DB::table('department_user')->updateOrInsert(
                    ['department_id' => $dept->id, 'user_id' => $member->id],
                    [
                        'role'       => 'member',
                        'joined_at'  => $now->copy()->subDays(rand(30, 365))->toDateString(),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
                $pivotAssigned++;
            }
        }

        // === 3) Cache member_count_cache ===
        foreach ($depts as $dept) {
            $count = DB::table('department_user')->where('department_id', $dept->id)->count();
            $dept->update(['member_count_cache' => $count]);
        }

        $this->command->info("  ✓ {$primaryAssigned} primaires + {$pivotAssigned} pivots seedés ({$depts->count()} dépts, member_count_cache MAJ)");
    }
}
