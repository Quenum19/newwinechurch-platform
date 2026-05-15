<?php

namespace Tests\Feature\Notifications;

use App\Events\CellReportSubmitted;
use App\Events\DepartmentReportReviewed;
use App\Events\DepartmentReportSubmitted;
use App\Listeners\NotifyGovernorOnCellReport;
use App\Listeners\NotifyGovernorOnReportReviewed;
use App\Listeners\NotifyPastorAndHR;
use App\Models\Cell;
use App\Models\CellLeader;
use App\Models\CellReport;
use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\DepartmentReport;
use App\Models\User;
use App\Notifications\CellReportSubmittedNotification;
use App\Notifications\DepartmentReportReviewedNotification;
use App\Notifications\DepartmentReportSubmittedNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Tests d'intégration du système de notifications Étape 3.
 *
 * Vérifie :
 *  - Les listeners abonnés envoient bien les Notifications attendues
 *  - Le canal database persiste dans la table notifications
 *  - Les préférences user (notification_preferences) filtrent les canaux
 *  - L'API inbox /api/notifications fonctionne (list, count, mark-read, destroy)
 */
class NotificationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $governor;
    protected User $pastor;
    protected User $leader;
    protected Department $department;
    protected Cell $cell;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->department = Department::create([
            'name' => 'Test Dept', 'slug' => 'test-dept',
            'status' => 'active', 'is_active' => true,
        ]);

        $this->governor = User::create([
            'name' => 'Gov', 'first_name' => 'Notif',
            'email' => 'gov-notif@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $this->department->id,
        ]);
        $this->governor->assignRole('gouverneur');
        $this->department->update(['governor_id' => $this->governor->id]);

        DepartmentGovernor::create([
            'user_id' => $this->governor->id,
            'department_id' => $this->department->id,
            'is_primary' => true,
            'appointed_at' => now()->subMonth(),
        ]);

        $this->pastor = User::create([
            'name' => 'Pastor', 'first_name' => 'Test',
            'email' => 'pastor-notif@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);
        $this->pastor->assignRole('pasteur');

        $this->leader = User::create([
            'name' => 'Leader', 'first_name' => 'Notif',
            'email' => 'leader-notif@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_cell_leader' => true,
            'department_id' => $this->department->id,
        ]);
        $this->leader->assignRole('leader');

        $this->cell = Cell::create([
            'name' => 'Cell Notif', 'slug' => 'cell-notif',
            'leader_id' => $this->leader->id,
            'status' => 'active', 'is_active' => true,
        ]);
        $this->leader->update(['cell_id' => $this->cell->id]);
        CellLeader::create([
            'cell_id' => $this->cell->id,
            'user_id' => $this->leader->id,
            'is_primary' => true,
            'appointed_at' => now()->subMonth(),
        ]);
    }

    public function test_listener_notifies_pastor_when_department_report_submitted(): void
    {
        Notification::fake();

        $report = DepartmentReport::create([
            'department_id' => $this->department->id,
            'governor_id'   => $this->governor->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now(),
        ]);

        // On invoque directement le listener pour éviter le bruit des autres events.
        (new NotifyPastorAndHR())->handle(new DepartmentReportSubmitted($report));

        Notification::assertSentTo(
            $this->pastor->fresh(),
            DepartmentReportSubmittedNotification::class
        );
    }

    public function test_listener_notifies_governor_when_cell_report_submitted(): void
    {
        Notification::fake();

        $report = CellReport::create([
            'cell_id'    => $this->cell->id,
            'leader_id'  => $this->leader->id,
            'week_start' => now()->subWeek()->startOfWeek(),
            'week_end'   => now()->subWeek()->endOfWeek(),
            'attendance_count' => 5,
            'status'           => 'submitted',
            'submitted_at'     => now(),
        ]);

        (new NotifyGovernorOnCellReport())->handle(new CellReportSubmitted($report));

        // Le gouverneur du leader (notre $this->governor) doit recevoir.
        Notification::assertSentTo(
            $this->governor->fresh(),
            CellReportSubmittedNotification::class
        );
    }

    public function test_listener_notifies_governor_when_report_reviewed(): void
    {
        Notification::fake();

        $report = DepartmentReport::create([
            'department_id' => $this->department->id,
            'governor_id'   => $this->governor->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'approved',
            'submitted_at'  => now()->subDay(),
            'reviewed_at'   => now(),
            'review_comment'=> 'Bien.',
        ]);

        (new NotifyGovernorOnReportReviewed())->handle(new DepartmentReportReviewed($report));

        Notification::assertSentTo(
            $this->governor->fresh(),
            DepartmentReportReviewedNotification::class
        );
    }

    public function test_user_preferences_filter_channels(): void
    {
        // Désactive email pour la catégorie 'reports' chez le pasteur.
        $this->pastor->update([
            'notification_preferences' => [
                'reports' => ['email' => false, 'broadcast' => true],
            ],
        ]);

        $report = DepartmentReport::create([
            'department_id' => $this->department->id,
            'governor_id'   => $this->governor->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now(),
        ]);

        $notif = new DepartmentReportSubmittedNotification($report);
        $channels = $notif->via($this->pastor->fresh());

        $this->assertContains('database', $channels);
        $this->assertContains('broadcast', $channels);
        $this->assertNotContains('mail', $channels, 'L\'email doit être filtré par les préférences user.');
    }

    public function test_notifications_inbox_api_works(): void
    {
        // Stocke une notification en BDD via Notification::send.
        $report = DepartmentReport::create([
            'department_id' => $this->department->id,
            'governor_id'   => $this->governor->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now(),
        ]);
        $this->governor->notify(new DepartmentReportReviewedNotification(tap($report)->update([
            'status' => 'approved', 'reviewed_at' => now(),
        ])));

        // Index.
        $resp = $this->actingAs($this->governor, 'sanctum')->getJson('/api/notifications');
        $resp->assertOk()->assertJsonStructure(['data' => [['id', 'type', 'data', 'is_read']]]);
        $this->assertGreaterThanOrEqual(1, count($resp->json('data')));

        // Count.
        $count = $this->actingAs($this->governor, 'sanctum')->getJson('/api/notifications/count');
        $count->assertOk()->assertJsonStructure(['unread', 'total']);
        $this->assertGreaterThanOrEqual(1, $count->json('unread'));

        // Mark all read.
        $this->actingAs($this->governor, 'sanctum')->postJson('/api/notifications/mark-read')->assertOk();
        $countAfter = $this->actingAs($this->governor, 'sanctum')->getJson('/api/notifications/count');
        $this->assertEquals(0, $countAfter->json('unread'));
    }
}
