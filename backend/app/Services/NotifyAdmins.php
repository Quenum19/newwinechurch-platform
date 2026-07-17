<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use App\Notifications\AppActivityNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Service helper — dispatch centralisé des notifications in-app aux admins
 * et aux managers scopés selon le contexte.
 *
 * Toutes les méthodes attrapent silencieusement les erreurs pour ne PAS
 * casser la mutation métier (créer un membre, un ticket…) si la queue
 * de notifications est indisponible.
 */
class NotifyAdmins
{
    /**
     * Notifie tous les admins globaux (superadmin, admin, pasteur, rh).
     * À utiliser pour toute activité qui concerne l'organisation globale :
     * nouveau membre, événement, dépt, don, demande d'adhésion…
     */
    public static function global(array $payload): void
    {
        try {
            $recipients = User::role(['superadmin', 'admin', 'pasteur', 'rh'])->get();
            if ($recipients->isEmpty()) return;
            Notification::send($recipients, new AppActivityNotification(self::withDefaults($payload)));
        } catch (\Throwable $e) {
            Log::warning('NotifyAdmins::global failed', [
                'type' => $payload['type'] ?? '?',
                'err'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifie les MANAGERS d'un event précis (via event_staff.grant=manager)
     * + les admins globaux.
     *
     * À utiliser pour : nouveau ticket vendu, waitlist entry, refund, etc.
     */
    public static function eventManagers(Event $event, array $payload): void
    {
        try {
            $managerIds = $event->activeStaff()
                ->whereIn('grant', ['manager', 'scanner_lead'])
                ->pluck('user_id');

            $recipients = User::query()
                ->where(function ($q) use ($managerIds) {
                    $q->whereIn('id', $managerIds)
                      ->orWhereHas('roles', fn ($r) => $r->whereIn('name', ['superadmin', 'admin', 'pasteur', 'rh']));
                })
                ->distinct()
                ->get();

            if ($recipients->isEmpty()) return;
            Notification::send($recipients, new AppActivityNotification(self::withDefaults($payload)));
        } catch (\Throwable $e) {
            Log::warning('NotifyAdmins::eventManagers failed', [
                'event_id' => $event->id,
                'type'     => $payload['type'] ?? '?',
                'err'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifie uniquement RH + pasteur (workflow admission, gestion membres).
     */
    public static function hr(array $payload): void
    {
        try {
            $recipients = User::role(['pasteur', 'rh', 'superadmin'])->get();
            if ($recipients->isEmpty()) return;
            Notification::send($recipients, new AppActivityNotification(self::withDefaults($payload)));
        } catch (\Throwable $e) {
            Log::warning('NotifyAdmins::hr failed', ['err' => $e->getMessage()]);
        }
    }

    /**
     * Notifie uniquement le pasteur (prière, demandes personnelles).
     */
    public static function pastor(array $payload): void
    {
        try {
            $recipients = User::role(['pasteur', 'superadmin'])->get();
            if ($recipients->isEmpty()) return;
            Notification::send($recipients, new AppActivityNotification(self::withDefaults($payload)));
        } catch (\Throwable $e) {
            Log::warning('NotifyAdmins::pastor failed', ['err' => $e->getMessage()]);
        }
    }

    /** Ajoute frontend_url au payload par défaut. */
    protected static function withDefaults(array $payload): array
    {
        if (isset($payload['url']) && ! str_starts_with($payload['url'], 'http')) {
            $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');
            $payload['url'] = $frontend . $payload['url'];
        }
        return $payload;
    }
}
