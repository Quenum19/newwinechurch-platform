<?php

namespace Tests\Feature\Admin;

use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\DepartmentReport;
use App\Models\User;
use App\Notifications\GovernorAppointedNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Tests d'intégration pour les routes admin étendues Étape 2.
 */
class AdminGovernorReviewTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $pasteur;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::create([
            'name' => 'Admin', 'first_name' => 'Test',
            'email' => 'admin.test@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);
        $this->admin->assignRole('superadmin');

        $this->pasteur = User::create([
            'name' => 'Pasteur', 'first_name' => 'Test',
            'email' => 'pasteur.test@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);
        $this->pasteur->assignRole('pasteur');
    }

    public function test_admin_lists_active_governors(): void
    {
        $dept = Department::create([
            'name' => 'Test Dept', 'slug' => 'test-dept',
            'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'Gov', 'first_name' => 'A',
            'email' => 'gov-list@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $dept->id,
        ]);
        $gov->assignRole('gouverneur');
        DepartmentGovernor::create([
            'user_id' => $gov->id,
            'department_id' => $dept->id,
            'is_primary' => true,
            'appointed_at' => now()->subMonth(),
        ]);

        $resp = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/governors');
        $resp->assertOk();
        $this->assertGreaterThanOrEqual(1, count($resp->json('data')));
    }

    public function test_admin_assigns_governor_and_notifies(): void
    {
        Notification::fake();

        $dept = Department::create([
            'name' => 'New Dept', 'slug' => 'new-dept',
            'status' => 'active', 'is_active' => true,
        ]);
        $candidate = User::create([
            'name' => 'Candidate', 'first_name' => 'Future',
            'email' => 'candidate@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);

        $resp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/departments/{$dept->id}/governor-assign", [
                'user_id'    => $candidate->id,
                'is_primary' => true,
            ]);

        $resp->assertCreated();
        $this->assertTrue($candidate->fresh()->is_governor);
        $this->assertEquals($candidate->id, $dept->fresh()->governor_id);

        // Le listener NotifyNewGovernor envoie une GovernorAppointedNotification au candidat.
        Notification::assertSentTo($candidate->fresh(), GovernorAppointedNotification::class);
    }

    public function test_admin_reviews_department_report(): void
    {
        Event::fake();

        $dept = Department::create([
            'name' => 'D', 'slug' => 'd-test', 'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'G', 'first_name' => 'X',
            'email' => 'g-review@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $dept->id,
        ]);
        $gov->assignRole('gouverneur');

        $report = DepartmentReport::create([
            'department_id' => $dept->id,
            'governor_id'   => $gov->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now(),
        ]);

        $resp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/department-reports/{$report->id}/review", [
                'status'         => 'approved',
                'review_comment' => 'Excellent travail.',
            ]);

        $resp->assertOk();
        $this->assertEquals('approved', $report->fresh()->status);
        Event::assertDispatched(\App\Events\DepartmentReportReviewed::class);
    }

    public function test_review_rejected_without_comment_is_invalid(): void
    {
        $dept = Department::create([
            'name' => 'D2', 'slug' => 'd2-test', 'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'G2', 'first_name' => 'X',
            'email' => 'g2@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
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

        $resp = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/department-reports/{$report->id}/review", [
                'status' => 'rejected',
                // pas de review_comment → doit échouer (422)
            ]);

        $resp->assertStatus(422);
    }
}
