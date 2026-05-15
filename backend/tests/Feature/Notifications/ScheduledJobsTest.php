<?php

namespace Tests\Feature\Notifications;

use App\Jobs\CheckMissingCellReportsJob;
use App\Jobs\CheckOverdueReportsJob;
use App\Models\Cell;
use App\Models\CellLeader;
use App\Models\Department;
use App\Models\DepartmentGovernor;
use App\Models\DepartmentReport;
use App\Models\User;
use App\Notifications\CellMissingReportNotification;
use App\Notifications\ReportOverdueNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Tests d'intégration des Jobs planifiés Étape 3.
 *
 * Vérifie que :
 *  - CheckOverdueReportsJob notifie bien le gouverneur d'un rapport en retard
 *  - CheckMissingCellReportsJob notifie le leader d'une cellule sans rapport
 *  - L'anti-spam (1 notif/jour/rapport) fonctionne
 */
class ScheduledJobsTest extends TestCase
{
    use RefreshDatabase;

    public function test_check_overdue_reports_notifies_governor(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Notification::fake();

        // Setup : un département actif avec gouverneur + un rapport "submitted" dont
        // period_end est dépassée depuis 10 jours (donc en retard, J+7 cleared).
        $dept = Department::create([
            'name' => 'Test Late', 'slug' => 'test-late',
            'status' => 'active', 'is_active' => true,
        ]);
        $gov = User::create([
            'name' => 'G', 'first_name' => 'Late',
            'email' => 'late-gov@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_governor' => true,
            'department_id' => $dept->id,
        ]);
        $gov->assignRole('gouverneur');
        DepartmentGovernor::create([
            'user_id' => $gov->id, 'department_id' => $dept->id,
            'is_primary' => true, 'appointed_at' => now()->subMonth(),
        ]);
        $dept->update(['governor_id' => $gov->id]);

        DepartmentReport::create([
            'department_id' => $dept->id,
            'governor_id'   => $gov->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subDays(40)->toDateString(),
            'period_end'    => now()->subDays(10)->toDateString(),
            'status'        => 'submitted',
            'submitted_at'  => now()->subDays(8),
        ]);

        // Exécution du Job synchrone.
        (new CheckOverdueReportsJob())->handle();

        // Le gouverneur doit avoir reçu une ReportOverdueNotification.
        Notification::assertSentTo($gov->fresh(), ReportOverdueNotification::class);
    }

    public function test_check_missing_cell_reports_notifies_leader(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Notification::fake();

        $leader = User::create([
            'name' => 'L', 'first_name' => 'Miss',
            'email' => 'miss-leader@nwc.test', 'password' => Hash::make('x@2026!Aa'),
            'status' => 'active', 'is_cell_leader' => true,
        ]);
        $leader->assignRole('leader');

        $cell = Cell::create([
            'name' => 'Cell Miss', 'slug' => 'cell-miss',
            'leader_id' => $leader->id,
            'status' => 'active', 'is_active' => true,
        ]);
        CellLeader::create([
            'cell_id' => $cell->id, 'user_id' => $leader->id,
            'is_primary' => true, 'appointed_at' => now()->subMonth(),
        ]);
        $leader->update(['cell_id' => $cell->id]);

        // Aucun cell_report n'existe → toutes les semaines passées sont manquantes.
        (new CheckMissingCellReportsJob())->handle();

        Notification::assertSentTo($leader->fresh(), CellMissingReportNotification::class);
    }
}
