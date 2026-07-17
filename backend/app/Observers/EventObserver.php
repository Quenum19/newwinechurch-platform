<?php

namespace App\Observers;

use App\Models\Department;
use App\Models\Event;
use App\Models\EventStaff;
use App\Models\User;
use App\Notifications\EventStaffGrantedNotification;
use App\Services\NotifyAdmins;
use Illuminate\Support\Facades\Log;

/**
 * EventObserver — Étape A rôles/permissions.
 *
 * À la création d'un event, provisionne automatiquement :
 *
 *  1. Le créateur (created_by) devient `manager` de son event.
 *     — Cas : pasteur/admin/rh a créé l'event, il en devient automatiquement
 *       manager. Il peut ensuite ajouter le respo du dépt organisateur via
 *       le panneau Staff.
 *
 *  2. Le/les respo(s) des départements listés dans config('tickets.
 *     scanner_lead_department_slugs') deviennent `scanner_lead` — accès
 *     scanner + gestion des scanners externes.
 *     — Cas : la respo Sécurité hérite automatiquement du grant scanner_lead
 *       sur CHAQUE nouvel event, sans intervention manuelle.
 *
 * Idempotent : si les grants existent déjà (event re-sauvegardé, seed…),
 * `firstOrCreate` évite les doublons.
 */
class EventObserver
{
    public function created(Event $event): void
    {
        $this->grantCreatorAsManager($event);
        $this->grantSecurityLeadsAsScannerLead($event);

        // Notif in-app pour les admins globaux → un nouvel event apparaît dans
        // l'agenda de l'église.
        NotifyAdmins::global([
            'type'     => 'new_event',
            'title'    => 'Nouvel événement créé',
            'body'     => "\"{$event->title}\" a été ajouté au catalogue.",
            'event_id' => $event->id,
            'url'      => '/admin/evenements/' . $event->id,
        ]);
    }

    protected function grantCreatorAsManager(Event $event): void
    {
        if (! $event->created_by) return;

        $staff = EventStaff::firstOrCreate(
            [
                'event_id' => $event->id,
                'user_id'  => $event->created_by,
            ],
            [
                'grant'          => EventStaff::GRANT_MANAGER,
                'assigned_by_id' => $event->created_by,
                'assigned_at'    => now(),
            ],
        );

        // Notif email seulement pour les nouvelles créations (pas les retry).
        if ($staff->wasRecentlyCreated) {
            $this->notifyStaffGranted($staff->user_id, $event, EventStaff::GRANT_MANAGER, null);
        }
    }

    protected function grantSecurityLeadsAsScannerLead(Event $event): void
    {
        $slugs = config('tickets.scanner_lead_department_slugs', []);
        if (empty($slugs)) return;

        // On récupère les départements sécurité et leurs gouverneurs actifs.
        $departments = Department::whereIn('slug', $slugs)
            ->with('governor')
            ->get();

        foreach ($departments as $dept) {
            $governor = $dept->governor;
            if (! $governor) {
                Log::info("EventObserver: dépt sécurité `{$dept->slug}` sans gouverneur, scanner_lead auto sauté.");
                continue;
            }

            // Si le gouverneur est aussi le créateur, il est déjà manager → skip.
            $existing = EventStaff::where('event_id', $event->id)
                                  ->where('user_id', $governor->id)
                                  ->first();
            if ($existing) continue;

            EventStaff::create([
                'event_id'       => $event->id,
                'user_id'        => $governor->id,
                'grant'          => EventStaff::GRANT_SCANNER_LEAD,
                'assigned_by_id' => $event->created_by,
                'assigned_at'    => now(),
            ]);

            $this->notifyStaffGranted($governor->id, $event, EventStaff::GRANT_SCANNER_LEAD, $event->created_by);
        }
    }

    /**
     * Envoi (queue) du mail d'onboarding à un user qui vient de recevoir un
     * grant. Non-bloquant : les échecs SMTP sont loggués mais n'empêchent pas
     * la création du grant.
     */
    protected function notifyStaffGranted(int $userId, Event $event, string $grant, ?int $assignerId): void
    {
        $user = User::find($userId);
        if (! $user) return;

        // Skip les users "invités" (guest scanner) — ils reçoivent le magic-link.
        if ($user->status === 'guest_scanner' || $user->hasRole('guest-scanner')) return;

        $assigner = $assignerId ? User::find($assignerId) : null;

        try {
            $user->notify(new EventStaffGrantedNotification($event, $grant, $assigner));
        } catch (\Throwable $e) {
            Log::warning('EventStaffGrantedNotification dispatch failed (observer)', [
                'user_id' => $userId, 'grant' => $grant, 'err' => $e->getMessage(),
            ]);
        }
    }
}
