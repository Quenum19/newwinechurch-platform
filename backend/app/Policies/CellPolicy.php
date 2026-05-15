<?php

namespace App\Policies;

use App\Models\Cell;
use App\Models\User;

/**
 * Policy cellule — scope par rôle.
 *
 *  - superadmin / pasteur / admin → tout
 *  - leader cellule → uniquement sa cellule (leader_id ou cell_leaders actif)
 *  - membre simple → vue de sa propre cellule (cf MyContextController, pas Admin)
 */
class CellPolicy
{
    /** superadmin/admin/rh/pasteur = carte blanche (tous gèrent les cellules). */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin', 'rh', 'pasteur'])) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('view cells');
    }

    public function view(User $user, Cell $cell): bool
    {
        return $cell->leader_id === $user->id
            || $cell->activeLeaders()->where('user_id', $user->id)->exists()
            || $user->cells()->where('cells.id', $cell->id)->exists();
    }

    public function create(User $user): bool
    {
        return false; // admins only (before)
    }

    public function update(User $user, Cell $cell): bool
    {
        return $cell->leader_id === $user->id
            || $cell->activeLeaders()
                    ->where('user_id', $user->id)
                    ->where('is_primary', true)
                    ->exists();
    }

    public function delete(User $user, Cell $cell): bool
    {
        return false;
    }

    /** Soumettre un rapport hebdomadaire : leader de la cellule uniquement. */
    public function submitReport(User $user, Cell $cell): bool
    {
        return ($cell->leader_id === $user->id
                || $cell->activeLeaders()->where('user_id', $user->id)->exists())
            && $user->can('submit cell reports');
    }

    /** Valider un rapport : admins uniquement (before). */
    public function validateReport(User $user, Cell $cell): bool
    {
        return false;
    }
}
