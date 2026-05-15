<?php

namespace App\Policies;

use App\Models\CellLeader;
use App\Models\User;

/**
 * Policy CellLeader — mandats leaders de cellule.
 *
 *  - admins → tout (before)
 *  - gouverneur du département parent → CRUD sur les leaders des cellules de
 *    son département (à terme, via la relation cell.department_id)
 *  - leader concerné → lecture
 *  - autres → refusé
 */
class CellLeaderPolicy
{
    /** superadmin + admin = carte blanche. Pasteur : lecture via permissions. */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('manage cell leader profile')
            || $user->is_governor
            || $user->is_cell_leader;
    }

    public function view(User $user, CellLeader $appointment): bool
    {
        return $appointment->user_id === $user->id
            || $user->is_governor; // périmètre département scopé côté controller
    }

    public function create(User $user): bool
    {
        return $user->can('manage cell leader profile')
            || $user->is_governor;
    }

    public function update(User $user, CellLeader $appointment): bool
    {
        return $user->can('manage cell leader profile')
            || $user->is_governor;
    }

    public function delete(User $user, CellLeader $appointment): bool
    {
        return false; // soft delete réservé aux admins (before)
    }
}
