<?php

namespace App\Console\Commands;

use App\Models\Cell;
use App\Models\CellReport;
use App\Models\Department;
use App\Models\DepartmentReport;
use App\Models\User;
use App\Notifications\CellLeaderAppointedNotification;
use App\Notifications\CellMissingReportNotification;
use App\Notifications\CellReportSubmittedNotification;
use App\Notifications\DepartmentReportReviewedNotification;
use App\Notifications\DepartmentReportSubmittedNotification;
use App\Notifications\GovernorAppointedNotification;
use App\Notifications\ReportOverdueNotification;
use Illuminate\Console\Command;

/**
 * `php artisan nwc:send-test-notification {userId} {type}`
 *
 * Envoie une notification de test pour valider le rendu mail + broadcast + DB.
 * Types : department_submitted, department_reviewed, cell_submitted, overdue,
 *         cell_missing, governor_appointed, leader_appointed.
 */
class SendTestNotificationCommand extends Command
{
    protected $signature   = 'nwc:send-test-notification {userId : ID de l\'utilisateur destinataire} {type : Type de notification}';
    protected $description = 'Envoie une notification de test (debug rendu mail / WS / inbox).';

    public function handle(): int
    {
        $userId = (int) $this->argument('userId');
        $type   = (string) $this->argument('type');

        $user = User::find($userId);
        if (! $user) {
            $this->error("Utilisateur #{$userId} introuvable.");
            return self::FAILURE;
        }

        $notification = $this->buildNotification($type);
        if (! $notification) {
            $this->error("Type inconnu : {$type}");
            $this->line('Types disponibles : department_submitted, department_reviewed, cell_submitted, overdue, cell_missing, governor_appointed, leader_appointed');
            return self::FAILURE;
        }

        $user->notify($notification);

        $this->info("✓ Notification '{$type}' envoyée à {$user->email} (#{$user->id}).");
        $this->line("Vérifie : log Mailpit, table notifications, channel WS.");
        return self::SUCCESS;
    }

    protected function buildNotification(string $type)
    {
        $dept = Department::first();
        $cell = Cell::first();
        if (! $dept) {
            $this->warn('Aucun département disponible — seed la DB d\'abord.');
            return null;
        }

        $report = DepartmentReport::first() ?: DepartmentReport::create([
            'department_id' => $dept->id,
            'governor_id'   => $dept->governor_id ?: User::role('superadmin')->first()?->id,
            'report_type'   => 'monthly_activity',
            'period_start'  => now()->subMonth()->startOfMonth(),
            'period_end'    => now()->subMonth()->endOfMonth(),
            'status'        => 'submitted',
            'submitted_at'  => now()->subDays(8),
        ]);

        return match ($type) {
            'department_submitted' => new DepartmentReportSubmittedNotification($report),
            'department_reviewed'  => new DepartmentReportReviewedNotification(tap($report)->update([
                'status' => 'approved', 'reviewed_at' => now(), 'review_comment' => 'Test review approved.',
            ])),
            'cell_submitted'       => $cell ? new CellReportSubmittedNotification(
                CellReport::where('cell_id', $cell->id)->first() ?: CellReport::create([
                    'cell_id' => $cell->id, 'leader_id' => $cell->leader_id ?: User::first()->id,
                    'week_start' => now()->subWeek()->startOfWeek(),
                    'week_end'   => now()->subWeek()->endOfWeek(),
                    'attendance_count' => 8, 'new_members' => 1, 'status' => 'submitted',
                    'submitted_at' => now(),
                ])
            ) : null,
            'overdue'              => new ReportOverdueNotification($report),
            'cell_missing'         => $cell ? new CellMissingReportNotification($cell, 2, [now()->subWeeks(2)->startOfWeek()->toDateString()]) : null,
            'governor_appointed'   => new GovernorAppointedNotification($dept),
            'leader_appointed'     => $cell ? new CellLeaderAppointedNotification($cell) : null,
            default                => null,
        };
    }
}
