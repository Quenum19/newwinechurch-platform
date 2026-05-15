<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\User;

/**
 * Policy département — scope par rôle.
 *
 *  - superadmin / admin → tout (carte blanche via before())
 *  - pasteur → lecture seule (passe par les méthodes spécifiques, NO carte blanche)
 *  - gouverneur (ex-capitaine) → uniquement son département (governor_id ou
 *    présent dans department_governors actif)
 *  - membre / public → lecture seule via API publique
 */
class DepartmentPolicy
{
    /**
     * Court-circuit : superadmin et admin uniquement. Le pasteur passe par les
     * méthodes spécifiques (view OK, update/delete bloqués par permission).
     */
    public function before(User $user, string $ability): ?bool
    {
        // Carte blanche pour les rôles admin (superadmin/admin/rh).
        // Le pasteur passe par les méthodes spécifiques pour respecter ses
        // permissions plus restreintes (lecture seule sur dépts).
        if ($user->hasAnyRole(['superadmin', 'admin', 'rh'])) {
            return true;
        }
        return null;
    }

    /** Voir la liste des départements en admin. */
    public function viewAny(User $user): bool
    {
        // Gouverneur = oui (il verra une liste filtrée à son département via le controller).
        return $user->can('view departments');
    }

    /** Voir le détail d'un département. */
    public function view(User $user, Department $dept): bool
    {
        // Le gouverneur ne voit que son département (cache + historique actif).
        return $dept->governor_id === $user->id
            || $dept->activeGovernors()->where('user_id', $user->id)->exists()
            || $user->departments()->where('departments.id', $dept->id)->exists();
    }

    /** Création réservée aux admins (le before() les a déjà laissé passer). */
    public function create(User $user): bool
    {
        return false;
    }

    /** Modification : gouverneur du département uniquement (parmi les non-admins). */
    public function update(User $user, Department $dept): bool
    {
        return $dept->governor_id === $user->id
            || $dept->activeGovernors()
                    ->where('user_id', $user->id)
                    ->where('is_primary', true)
                    ->exists();
    }

    /** Suppression : admins uniquement (refusé pour gouverneur). */
    public function delete(User $user, Department $dept): bool
    {
        return false;
    }

    /** Assigner un gouverneur : admins uniquement. */
    public function assignGovernor(User $user, Department $dept): bool
    {
        return false;
    }
}
