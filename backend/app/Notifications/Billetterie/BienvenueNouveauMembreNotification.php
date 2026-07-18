<?php

namespace App\Notifications\Billetterie;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sprint B — #6 Bienvenue nouveau membre NWC.
 *
 * Destinataire : le user qui vient de s'inscrire (self-notified).
 * Non critique, mais reçu par défaut (opt-out possible).
 */
class BienvenueNouveauMembreNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public User $user) {}

    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        return (new MailMessage())
            ->subject("🙌 Bienvenue à New Wine Church")
            ->view('emails.billetterie.bienvenue_membre', [
                'recipient'      => $notifiable,
                'first_name'     => $notifiable->first_name ?? 'cher membre',
                'espace_url'     => $frontend . '/mon-espace',
                'events_url'     => $frontend . '/mission/evenements',
                'sermons_url'    => $frontend . '/messages',
                'blog_url'       => $frontend . '/blog',
                'cellules_url'   => $frontend . '/communaute',
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'  => 'billetterie_bienvenue_membre',
            'title' => "Bienvenue à New Wine Church",
            'body'  => "Ravi de t'accueillir dans la famille NWC — Sauvé pour Sauver.",
            'url'   => '/mon-espace',
        ];
    }
}
