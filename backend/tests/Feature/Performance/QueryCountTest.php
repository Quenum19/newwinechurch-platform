<?php

namespace Tests\Feature\Performance;

use App\Http\Controllers\Governor\GovernorDashboardController;
use App\Models\Cell;
use App\Models\CellLeader;
use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Test perf : nombre de requêtes SQL pour charger le dashboard gouverneur.
 *
 * Empêche les régressions N+1 sans avoir besoin de Telescope. On définit un
 * plafond généreux (< 35 requêtes même avec 5 cellules), si on dépasse c'est
 * qu'un eager loading manque.
 */
class QueryCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_governor_dashboard_query_count_is_bounded(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Cache::flush(); // pas de cache pour mesurer réellement

        // Setup réaliste : 1 dept + 1 gouverneur + 5 cellules avec leaders.
        $dept = Department::create([
            'name' => 'D Perf', 'slug' => 'd-perf',
            'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'GovPerf', 'first_name' => 'P',
            'email' => 'gov-perf@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $dept->id,
        ]);
        $gov->assignRole('gouverneur');
        DepartmentGovernor::create([
            'user_id' => $gov->id, 'department_id' => $dept->id,
            'is_primary' => true, 'appointed_at' => now()->subMonth(),
        ]);
        $dept->update(['governor_id' => $gov->id]);

        // 5 cellules avec leaders du dept.
        for ($i = 1; $i <= 5; $i++) {
            $leader = User::create([
                'name' => "L{$i}", 'first_name' => "Perf",
                'email' => "leader-perf-{$i}@nwc.test", 'password' => Hash::make('x@2026!Aa'),
                'status' => 'active', 'is_cell_leader' => true,
                'department_id' => $dept->id,
            ]);
            $leader->assignRole('leader');
            $cell = Cell::create([
                'name' => "Cell Perf {$i}", 'slug' => "cell-perf-{$i}",
                'leader_id' => $leader->id,
                'status' => 'active', 'is_active' => true,
            ]);
            CellLeader::create([
                'cell_id' => $cell->id, 'user_id' => $leader->id,
                'is_primary' => true, 'appointed_at' => now()->subMonth(),
            ]);
            $leader->update(['cell_id' => $cell->id]);
        }

        // === Mesure ===
        DB::enableQueryLog();
        $resp = $this->actingAs($gov, 'sanctum')->getJson('/api/governor/dashboard');
        $resp->assertOk();
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $count = count($queries);

        // Budget : 35 requêtes max pour le dashboard complet (5 cellules).
        // Au-delà, c'est qu'un N+1 s'est glissé (santé cellules ou trends).
        $this->assertLessThanOrEqual(
            35,
            $count,
            "Dashboard gouverneur : {$count} requêtes SQL — N+1 suspecté (budget : 35).\n" .
            'Vérifie eager loading dans GovernorDashboardController::build().'
        );
    }
}
