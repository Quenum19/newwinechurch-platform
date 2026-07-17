<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification générique in-app (bell + broadcast) pour toute activité NWC
 * qui doit remonter à l'admin ou aux managers :
 *  - nouveaux inscrits / achats de tickets
 *  - créations événement / membre / département
 *  - demandes d'adhésion, prières, contact, dons
 *  - etc.
 *
 * Pas de mail : réservé aux notifications personnelles importantes
 * (attribution de rôle, réinitialisation mdp, etc.). L'app-bell suffit
 * pour l'activité opérationnelle et évite le spam mail.
 *
 * Payload minimal attendu :
 *  - type       : slug de l'événement (ex: new_ticket, new_event, new_member)
 *  - title      : ligne principale
 *  - body       : détail
 *  - url        : lien direct pour l'action
 *
 * Champs additionnels libres (event_id, user_id, etc.) pour context.
 */
class AppActivityNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public array $payload) {}

    public function via(User $notifiable): array
    {
        $channels = ['database'];
        if ($notifiable->notificationChannels('appointment', 'broadcast')) {
            $channels[] = 'broadcast';
        }
        return $channels;
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload);
    }

    public function toArray(User $notifiable): array
    {
        return $this->payload;
    }
}
