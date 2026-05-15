<?php

namespace Tests\Feature\Governor;

use App\Models\Cell;
use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\DepartmentReport;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests d'intégration pour l'espace gouverneur.
 * Vérifie le scoping, le workflow draft → submitted, et les refus 403.
 */
class GovernorEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected User $governor;
    protected Department $department;
    protected Department $otherDepartment;

    protected function setUp(): void
    {
        parent::setUp();

        // Rôles + permissions (idempotent dans le seeder).
        $this->seed(RolesAndPermissionsSeeder::class);

        // Création de 2 départements (le gouverneur ne doit voir que le sien).
        $this->department = Department::create([
            'name' => 'Évangélisation Test',
            'slug' => 'evangelisation-test',
            'status' => 'active',
            'is_active' => true,
        ]);
        $this->otherDepartment = Department::create([
            'name' => 'Finance Test',
            'slug' => 'finance-test',
            'status' => 'active',
            'is_active' => true,
        ]);

        // Création du gouverneur.
        $this->governor = User::create([
            'name' => 'Gouverneur',
            'first_name' => 'Test',
            'email' => 'gov.test@nwc.test',
            'password' => Hash::make('Test@2026!'),
            'status' => 'active',
            'is_governor' => true,
            'department_id' => $this->department->id,
        ]);
        $this->governor->assignRole('gouverneur');

        // Mandat actif dans department_governors.
        DepartmentGovernor::create([
            'user_id' => $this->governor->id,
            'department_id' => $this->department->id,
            'is_primary' => true,
            'appointed_at' => now()->subMonths(3),
        ]);
        $this->department->update(['governor_id' => $this->governor->id]);
    }

    public function test_governor_can_access_dashboard(): void
    {
        $response = $this->actingAs($this->governor, 'sanctum')
            ->getJson('/api/governor/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'department' => ['id', 'name', 'slug'],
                'kpis' => ['members_count', 'cells_count', 'reports_pending_count'],
                'trends' => ['members_trend', 'attendance_trend'],
                'cells_health',
            ]);
    }

    public function test_non_governor_cannot_access_governor_routes(): void
    {
        $simpleMember = User::create([
            'name' => 'Membre',
            'first_name' => 'Simple',
            'email' => 'membre@nwc.test',
            'password' => Hash::make('Test@2026!'),
            'status' => 'active',
        ]);
        $simpleMember->assignRole('membre');

        $response = $this->actingAs($simpleMember, 'sanctum')
            ->getJson('/api/governor/dashboard');

        $response->assertForbidden();
    }

    public function test_governor_can_create_update_and_submit_report(): void
    {
        Event::fake();

        // Création (draft).
        $createResp = $this->actingAs($this->governor, 'sanctum')
            ->postJson('/api/governor/reports', [
                'report_type'   => 'monthly_activity',
                'period_start'  => now()->subMonth()->startOfMonth()->toDateString(),
                'period_end'    => now()->subMonth()->endOfMonth()->toDateString(),
                'form_data'     => ['activities_summary' => 'Activités test'],
            ]);
        $createResp->assertCreated();
        $reportId = $createResp->json('data.id');

        // Mise à jour (encore draft).
        $updateResp = $this->actingAs($this->governor, 'sanctum')
            ->putJson("/api/governor/reports/{$reportId}", [
                'form_data' => ['activities_summary' => 'Activités test V2'],
            ]);
        $updateResp->assertOk();

        // Soumission.
        $submitResp = $this->actingAs($this->governor, 'sanctum')
            ->postJson("/api/governor/reports/{$reportId}/submit");
        $submitResp->assertOk();
        $this->assertEquals('submitted', DepartmentReport::find($reportId)->status);

        // L'event de soumission est dispatché (les listeners enverront les notifs).
        Event::assertDispatched(\App\Events\DepartmentReportSubmitted::class);

        // Update d'un report SUBMITTED → refusé (policy update).
        $updateAfterSubmit = $this->actingAs($this->governor, 'sanctum')
            ->putJson("/api/governor/reports/{$reportId}", [
                'form_data' => ['activities_summary' => 'Tentative tardive'],
            ]);
        $updateAfterSubmit->assertForbidden();
    }

    public function test_governor_cannot_see_other_department_reports(): void
    {
        // Création d'un rapport pour l'autre département.
        $otherReport = DepartmentReport::create([
            'department_id' => $this->otherDepartment->id,
            'governor_id'   => $this->governor->id, // peu importe — le scope test est department_id
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now(),
        ]);

        // GET /governor/reports doit retourner UNIQUEMENT les rapports du dept du gouverneur.
        $resp = $this->actingAs($this->governor, 'sanctum')
            ->getJson('/api/governor/reports');
        $resp->assertOk();

        $ids = collect($resp->json('data'))->pluck('id')->all();
        $this->assertNotContains($otherReport->id, $ids,
            'Le gouverneur ne doit pas voir le rapport d\'un autre département.');

        // Accès direct au rapport d'un autre dept → 403.
        $direct = $this->actingAs($this->governor, 'sanctum')
            ->getJson("/api/governor/reports/{$otherReport->id}");
        $direct->assertForbidden();
    }

    public function test_governor_can_list_cells_scoped_to_department(): void
    {
        // Cellule avec leader dans le dept du gouverneur.
        $leaderInDept = User::create([
            'name' => 'Leader1', 'first_name' => 'A',
            'email' => 'l1@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_cell_leader' => true,
            'department_id' => $this->department->id,
        ]);
        Cell::create([
            'name' => 'Cellule A', 'slug' => 'cellule-a',
            'leader_id' => $leaderInDept->id,
            'status' => 'active', 'is_active' => true,
        ]);

        // Cellule avec leader dans un autre dept.
        $leaderOther = User::create([
            'name' => 'LeaderOther', 'first_name' => 'B',
            'email' => 'l2@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_cell_leader' => true,
            'department_id' => $this->otherDepartment->id,
        ]);
        Cell::create([
            'name' => 'Cellule B', 'slug' => 'cellule-b',
            'leader_id' => $leaderOther->id,
            'status' => 'active', 'is_active' => true,
        ]);

        $resp = $this->actingAs($this->governor, 'sanctum')
            ->getJson('/api/governor/cells');
        $resp->assertOk();

        $names = collect($resp->json('data'))->pluck('name')->all();
        $this->assertContains('Cellule A', $names);
        $this->assertNotContains('Cellule B', $names);
    }
}
