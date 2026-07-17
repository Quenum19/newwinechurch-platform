<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;

/**
 * Policy événement — Étape A rôles/permissions billetterie.
 *
 * Modèle en 2 couches :
 *  - Couche 1 : rôles globaux (pasteur / admin / rh) → carte blanche.
 *  - Couche 2 : grants scopés `event_staff` (manager / scanner_lead / scanner)
 *              → autorise sur CET event précis uniquement.
 *
 * La création d'événement reste réservée aux rôles admin globaux — le respo
 * de département organisateur est ensuite ajouté comme `manager` sur l'event
 * via le panneau Staff (Étape B).
 */
class EventPolicy
{
    /**
     * Carte blanche pour rôles admin globaux (superadmin/admin/pasteur/rh).
     * Ces rôles sont manager implicite sur tous les events.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasAnyRole(['superadmin', 'admin', 'pasteur', 'rh'])) {
            return true;
        }
        return null;
    }

    /** Voir la liste des events côté admin. */
    public function viewAny(User $user): bool
    {
        // Un user avec au moins un grant actif sur un event peut accéder
        // à l'écran admin (filtré aux events dont il est staff, côté ctrl).
        return $user->eventStaff()->active()->exists();
    }

    /** Voir le détail admin d'UN event. */
    public function view(User $user, Event $event): bool
    {
        return $event->userCanScan($user);
    }

    /** Créer un event : réservé rôles admin globaux (before() les laisse passer). */
    public function create(User $user): bool
    {
        return false;
    }

    /** Éditer l'event : manager sur cet event. */
    public function update(User $user, Event $event): bool
    {
        return $event->userCanManage($user);
    }

    /** Supprimer : rôles admin globaux uniquement. */
    public function delete(User $user, Event $event): bool
    {
        return false;
    }

    // === ACTIONS BILLETTERIE SCOPÉES ===

    /** Voir la liste des inscrits, filtrer, chercher. Manager OU scanner (lecture). */
    public function viewAttendees(User $user, Event $event): bool
    {
        return $event->userCanScan($user);
    }

    /** Exporter Excel, envoyer emails groupés, actions destructives. Manager. */
    public function manageAttendees(User $user, Event $event): bool
    {
        return $event->userCanManage($user);
    }

    /** Convertir waitlist → ticket. Manager. */
    public function manageWaitlist(User $user, Event $event): bool
    {
        return $event->userCanManage($user);
    }

    /** Scanner un ticket à l'entrée. Scanner (ou plus haut). */
    public function scan(User $user, Event $event): bool
    {
        return $event->userCanScan($user);
    }

    // === GESTION DU STAFF DE L'EVENT ===

    /** Voir le panneau staff. Manager OU scanner_lead (pour voir ses invités). */
    public function viewStaff(User $user, Event $event): bool
    {
        return $event->userCanManageScanners($user);
    }

    /**
     * Ajouter/retirer un MANAGER : manager uniquement.
     * (Un scanner_lead ne peut pas promouvoir un user en manager.)
     */
    public function manageManagers(User $user, Event $event): bool
    {
        return $event->userCanManage($user);
    }

    /**
     * Inviter/retirer un SCANNER (interne ou externe via magic-link).
     * Autorisé pour manager ET scanner_lead — la respo Sécurité gère ses agents.
     */
    public function manageScanners(User $user, Event $event): bool
    {
        return $event->userCanManageScanners($user);
    }
}
