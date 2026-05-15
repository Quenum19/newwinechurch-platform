<?php

namespace App\Policies;

use App\Models\CellReport;
use App\Models\User;

/**
 * Policy CellReport — rapports hebdomadaires de cellule.
 *
 *  - admins / pasteur → tout (before)
 *  - leader de la cellule → create + update tant que status=draft + view
 *  - gouverneur du département parent → view (à terme via cell.department_id)
 *  - autres → refusé
 */
class CellReportPolicy
{
    /** superadmin + admin = carte blanche. Pasteur passe par les permissions. */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('view cell reports')
            || $user->is_cell_leader
            || $user->is_governor;
    }

    public function view(User $user, CellReport $report): bool
    {
        // Leader de la cellule (cache ou mandat actif).
        if ($report->cell && (
            $report->cell->leader_id === $user->id
            || $report->cell->activeLeaders()->where('user_id', $user->id)->exists()
        )) {
            return true;
        }
        // Gouverneur (vu large : tous les rapports de cellule de son département).
        // Le scoping fin par dept_id se fait côté controller.
        if ($user->is_governor) {
            return true;
        }
        return $user->can('view cell reports');
    }

    public function create(User $user): bool
    {
        return $user->is_cell_leader && $user->can('submit cell reports');
    }

    public function update(User $user, CellReport $report): bool
    {
        if ($report->status !== 'draft') {
            return false;
        }
        return $report->leader_id === $user->id;
    }

    public function submit(User $user, CellReport $report): bool
    {
        return $report->status === 'draft'
            && $report->leader_id === $user->id
            && $user->can('submit cell reports');
    }

    /** Validation : pasteur (via permission) + admins (via before). */
    public function review(User $user, CellReport $report): bool
    {
        return $user->can('validate cell reports');
    }

    public function delete(User $user, CellReport $report): bool
    {
        return false;
    }
}
