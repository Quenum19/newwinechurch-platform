<?php

namespace App\Policies;

use App\Models\GovernorProfile;
use App\Models\User;

/**
 * Policy GovernorPolicy — droits d'un gouverneur sur son périmètre.
 *
 * Règle prompt Étape 1 :
 *   "un gouverneur ne peut voir/éditer que son département (scope via
 *   department_governors)"
 *
 * Rattachée au modèle GovernorProfile via Gate::policy() dans AppServiceProvider
 * — le nom de classe diffère du nom du modèle, l'auto-discovery Laravel attendrait
 * GovernorProfilePolicy. On enregistre explicitement.
 *
 *  - superadmin / pasteur / admin → tout (before)
 *  - gouverneur lui-même → CRUD sur SON profil, vérification mandat actif dans
 *    department_governors (ended_at IS NULL)
 *  - autres → lecture publique uniquement
 */
class GovernorPolicy
{
    /** superadmin + admin = carte blanche (gestion gouverneurs). Pasteur : lecture seule via permissions. */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        // Annuaire des gouverneurs : accessible à tout utilisateur authentifié.
        return true;
    }

    /** Voir un profil gouverneur (visibilité publique pour la page département). */
    public function view(User $user, GovernorProfile $profile): bool
    {
        return true;
    }

    /** Créer son profil gouverneur (uniquement si mandat actif). */
    public function create(User $user): bool
    {
        return $this->isActiveGovernor($user)
            && $user->can('manage governor profile');
    }

    /**
     * Édition : strictement son propre profil ET mandat ouvert dans
     * department_governors (scope explicitement demandé par le prompt).
     */
    public function update(User $user, GovernorProfile $profile): bool
    {
        return $profile->user_id === $user->id
            && $this->isActiveGovernor($user)
            && $user->can('manage governor profile');
    }

    /** Suppression : admins uniquement (before les a déjà laissés passer). */
    public function delete(User $user, GovernorProfile $profile): bool
    {
        return false;
    }

    /**
     * Vérifie un mandat ouvert dans department_governors (ended_at NULL).
     * Le flag is_governor sur users est un cache : on confirme par le pivot.
     */
    protected function isActiveGovernor(User $user): bool
    {
        if (! $user->is_governor) {
            return false;
        }
        return $user->governorAppointments()
                    ->whereNull('ended_at')
                    ->exists();
    }
}
