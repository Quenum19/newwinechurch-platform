<?php

namespace Tests\Feature\Notifications;

use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\DepartmentReport;
use App\Models\User;
use App\Notifications\DepartmentReportReviewedNotification;
use App\Notifications\DepartmentReportSubmittedNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification as NotificationContract;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Tests d'intégration broadcast : valide qu'une notification soumise à un
 * gouverneur/pasteur emprunte bien les canaux 'database' + 'mail' + 'broadcast'
 * (proxy testable de "Reverb < 2s" — on ne lance pas le serveur WebSocket en
 * test, on valide juste que le payload broadcast est correctement formé).
 */
class BroadcastChannelTest extends TestCase
{
    use RefreshDatabase;

    public function test_submitted_notification_uses_broadcast_channel_for_pastor(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $pastor = User::create([
            'name' => 'P', 'first_name' => 'Test',
            'email' => 'pastor-broadcast@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);
        $pastor->assignRole('pasteur');

        $dept = Department::create([
            'name' => 'D', 'slug' => 'd-broadcast',
            'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'G', 'first_name' => 'X',
            'email' => 'g-broadcast@nwc.test', 'password' => Hash::make('x@2026!Aa'),
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

        $notif = new DepartmentReportSubmittedNotification($report);
        $channels = $notif->via($pastor);

        $this->assertContains('database',  $channels);
        $this->assertContains('broadcast', $channels);
        $this->assertContains('mail',      $channels);

        // Le payload broadcast contient le minimum pour le toast frontend.
        $payload = $notif->toBroadcast($pastor)->data;
        $this->assertEquals('department_report_submitted', $payload['type']);
        $this->assertEquals($report->id, $payload['report_id']);
        $this->assertEquals($dept->id, $payload['dept_id']);
    }

    public function test_reviewed_notification_broadcast_includes_status_and_comment(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $gov = User::create([
            'name' => 'G', 'first_name' => 'Receive',
            'email' => 'g-receive@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active',
        ]);

        $dept = Department::create([
            'name' => 'D', 'slug' => 'd-rev',
            'status' => 'active', 'is_active' => true,
        ]);

        $report = DepartmentReport::create([
            'department_id' => $dept->id,
            'governor_id'   => $gov->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'rejected',
            'submitted_at'  => now()->subDay(),
            'reviewed_at'   => now(),
            'review_comment'=> 'À corriger.',
        ]);

        $notif = new DepartmentReportReviewedNotification($report);
        $payload = $notif->toBroadcast($gov)->data;

        $this->assertEquals('rejected', $payload['status']);
        $this->assertEquals('À corriger.', $payload['review_comment']);
    }
}
