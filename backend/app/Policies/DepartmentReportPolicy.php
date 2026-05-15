<?php

namespace App\Policies;

use App\Models\DepartmentReport;
use App\Models\User;

/**
 * Policy DepartmentReport — rapports périodiques par département.
 *
 *  - admins / pasteur → tout (before)
 *  - gouverneur du dept → create + update tant que status=draft + view
 *  - RH → view + export (côté controller)
 *  - autres → refusé
 *
 * Note importante : un rapport SUBMITTED est immuable côté gouverneur.
 * Seuls les admins peuvent annoter via review_comment.
 */
class DepartmentReportPolicy
{
    /** superadmin + admin = carte blanche. Pasteur passe par les permissions Spatie. */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin'])) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->can('view department reports')
            || $user->is_governor;
    }

    public function view(User $user, DepartmentReport $report): bool
    {
        // Gouverneur du département (cache ou mandat actif).
        if ($report->department && (
            $report->department->governor_id === $user->id
            || $report->department->activeGovernors()->where('user_id', $user->id)->exists()
        )) {
            return true;
        }
        // RH avec permission view (déjà retourné true ci-dessus via can).
        return $user->can('view department reports');
    }

    /** Création : gouverneur de son département uniquement. */
    public function create(User $user): bool
    {
        return $user->is_governor && $user->can('submit department report');
    }

    /** Mise à jour : seulement si encore en draft ET par le gouverneur soumetteur. */
    public function update(User $user, DepartmentReport $report): bool
    {
        if ($report->status !== 'draft') {
            return false;
        }
        return $report->governor_id === $user->id;
    }

    /** Soumission : transition draft → submitted, gouverneur soumetteur. */
    public function submit(User $user, DepartmentReport $report): bool
    {
        return $report->status === 'draft'
            && $report->governor_id === $user->id
            && $user->can('submit department report');
    }

    /** Revue / approbation / rejet : pasteur (via permission) + admins (via before). */
    public function review(User $user, DepartmentReport $report): bool
    {
        return $user->can('review department report');
    }

    public function delete(User $user, DepartmentReport $report): bool
    {
        return false;
    }
}
