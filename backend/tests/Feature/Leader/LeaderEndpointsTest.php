<?php

namespace Tests\Feature\Leader;

use App\Models\Cell;
use App\Models\CellAttendance;
use App\Models\CellLeader;
use App\Models\CellReport;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests d'intégration pour l'espace leader de cellule.
 */
class LeaderEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected User $leader;
    protected Cell $cell;
    protected User $member1;
    protected User $member2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->leader = User::create([
            'name' => 'Leader', 'first_name' => 'Test',
            'email' => 'leader@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_cell_leader' => true,
        ]);
        $this->leader->assignRole('leader');

        $this->cell = Cell::create([
            'name' => 'Cellule Test', 'slug' => 'cellule-test',
            'leader_id' => $this->leader->id,
            'status' => 'active', 'is_active' => true,
        ]);

        CellLeader::create([
            'cell_id' => $this->cell->id,
            'user_id' => $this->leader->id,
            'is_primary' => true,
            'appointed_at' => now()->subMonth(),
        ]);

        $this->leader->update(['cell_id' => $this->cell->id]);

        // 2 membres dans la cellule.
        $this->member1 = User::create([
            'name' => 'M1', 'first_name' => 'A',
            'email' => 'm1@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'cell_id' => $this->cell->id,
        ]);
        $this->member2 = User::create([
            'name' => 'M2', 'first_name' => 'B',
            'email' => 'm2@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'cell_id' => $this->cell->id,
        ]);
        $this->cell->members()->attach([$this->member1->id, $this->member2->id], [
            'role' => 'member',
            'joined_at' => now()->toDateString(),
        ]);
    }

    public function test_leader_dashboard_returns_kpis(): void
    {
        $resp = $this->actingAs($this->leader, 'sanctum')
            ->getJson('/api/leader/dashboard');
        $resp->assertOk()
            ->assertJsonStructure([
                'cell' => ['id', 'name'],
                'kpis' => ['members_count', 'missing_reports_count'],
            ]);
        $this->assertEquals(2, $resp->json('kpis.members_count'));
    }

    public function test_non_leader_gets_403(): void
    {
        $member = User::create([
            'name' => 'X', 'first_name' => 'Y',
            'email' => 'simple@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);
        $member->assignRole('membre');

        $this->actingAs($member, 'sanctum')
            ->getJson('/api/leader/dashboard')
            ->assertForbidden();
    }

    public function test_leader_can_record_attendance_batch(): void
    {
        $payload = [
            'meeting_date' => now()->subDays(1)->toDateString(),
            'attendances' => [
                ['member_id' => $this->member1->id, 'is_present' => true, 'arrived_late' => false],
                ['member_id' => $this->member2->id, 'is_present' => false],
            ],
        ];

        $resp = $this->actingAs($this->leader, 'sanctum')
            ->postJson('/api/leader/attendance', $payload);
        $resp->assertCreated();

        $this->assertEquals(2, CellAttendance::where('cell_id', $this->cell->id)->count());

        // Re-submit (upsert) — pas de doublon, pas d'erreur.
        $resp2 = $this->actingAs($this->leader, 'sanctum')
            ->postJson('/api/leader/attendance', array_merge($payload, [
                'attendances' => [
                    ['member_id' => $this->member1->id, 'is_present' => false, 'note' => 'malade'],
                ],
            ]));
        $resp2->assertCreated();

        // Toujours 2 lignes (1 upsert + 1 inchangée pour m2).
        $this->assertEquals(2, CellAttendance::where('cell_id', $this->cell->id)->count());
        $this->assertFalse((bool) CellAttendance::where('member_id', $this->member1->id)->first()->is_present);
    }

    public function test_leader_attendance_rejects_unknown_member(): void
    {
        $stranger = User::create([
            'name' => 'Stranger', 'first_name' => 'Foreign',
            'email' => 'stranger@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);

        $resp = $this->actingAs($this->leader, 'sanctum')
            ->postJson('/api/leader/attendance', [
                'meeting_date' => now()->subDays(1)->toDateString(),
                'attendances' => [
                    ['member_id' => $stranger->id, 'is_present' => true],
                ],
            ]);

        $resp->assertStatus(422);
    }

    public function test_leader_can_create_and_submit_cell_report(): void
    {
        Event::fake();

        $weekStart = now()->subWeek()->startOfWeek()->toDateString();
        $create = $this->actingAs($this->leader, 'sanctum')
            ->postJson('/api/leader/reports', [
                'week_start'       => $weekStart,
                'attendance_count' => 1,
                'new_members'      => 0,
                'highlights'       => 'Bonne semaine',
            ]);
        $create->assertCreated();
        $reportId = $create->json('data.id');

        $submit = $this->actingAs($this->leader, 'sanctum')
            ->postJson("/api/leader/reports/{$reportId}/submit");
        $submit->assertOk();

        $this->assertEquals('submitted', CellReport::find($reportId)->status);
        Event::assertDispatched(\App\Events\CellReportSubmitted::class);
    }
}
