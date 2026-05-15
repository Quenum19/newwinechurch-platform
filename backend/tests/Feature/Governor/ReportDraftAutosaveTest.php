<?php

namespace Tests\Feature\Governor;

use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\DepartmentReport;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Test auto-save draft : un PUT silencieux sur un rapport DRAFT doit mettre à
 * jour form_data sans changer le status. C'est ce que fait le hook de
 * sauvegarde 30s côté frontend (GovReportForm.jsx).
 */
class ReportDraftAutosaveTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_can_be_updated_silently_via_put(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $dept = Department::create([
            'name' => 'D', 'slug' => 'd-auto',
            'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'G', 'first_name' => 'Auto',
            'email' => 'gov-auto@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $dept->id,
        ]);
        $gov->assignRole('gouverneur');
        DepartmentGovernor::create([
            'user_id' => $gov->id, 'department_id' => $dept->id,
            'is_primary' => true, 'appointed_at' => now()->subMonth(),
        ]);
        $dept->update(['governor_id' => $gov->id]);

        $report = DepartmentReport::create([
            'department_id' => $dept->id,
            'governor_id'   => $gov->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'form_data'     => ['activities_summary' => 'v1'],
            'status'        => 'draft',
        ]);

        // PUT silent (simule l'auto-save 30s du frontend).
        $resp = $this->actingAs($gov, 'sanctum')
            ->putJson("/api/governor/reports/{$report->id}", [
                'form_data' => ['activities_summary' => 'v2 — auto-save'],
            ]);

        $resp->assertOk();

        $report->refresh();
        $this->assertEquals('v2 — auto-save', $report->form_data['activities_summary']);
        $this->assertEquals('draft', $report->status, 'Le status doit rester draft après auto-save.');
    }

    public function test_cannot_update_submitted_report(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $dept = Department::create([
            'name' => 'D', 'slug' => 'd-locked',
            'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'G', 'first_name' => 'Locked',
            'email' => 'gov-locked@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $dept->id,
        ]);
        $gov->assignRole('gouverneur');
        DepartmentGovernor::create([
            'user_id' => $gov->id, 'department_id' => $dept->id,
            'is_primary' => true, 'appointed_at' => now()->subMonth(),
        ]);

        $report = DepartmentReport::create([
            'department_id' => $dept->id,
            'governor_id'   => $gov->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now(),
        ]);

        $this->actingAs($gov, 'sanctum')
            ->putJson("/api/governor/reports/{$report->id}", [
                'form_data' => ['hacky' => 'value'],
            ])
            ->assertForbidden();
    }
}
