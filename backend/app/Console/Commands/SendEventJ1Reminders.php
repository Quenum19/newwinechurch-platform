<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Notifications\Billetterie\RappelJourJ1Notification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Sprint B — #5 Rappel J-1 (24h avant event).
 *
 * Tourne toutes les heures : cible events avec starts_at ∈ [now+24h, now+25h].
 * Idempotence via flag `reminders_j1_sent_at` sur Event.
 *
 * Envoi : tous les tickets confirmed non-refunded de cet event.
 */
class SendEventJ1Reminders extends Command
{
    protected $signature = 'nwc:tickets-remind-j1';
    protected $description = 'Envoie le rappel J-1 aux inscrits (events entre now+24h et now+25h).';

    public function handle(): int
    {
        $windowStart = now()->copy()->addHours(24);
        $windowEnd   = now()->copy()->addHours(25);

        $events = Event::query()
            ->where('ticketing_enabled', true)
            ->whereBetween('starts_at', [$windowStart, $windowEnd])
            ->whereNull('reminders_j1_sent_at') // idempotence
            ->get();

        if ($events->isEmpty()) {
            $this->info('Aucun event dans la fenêtre J-1.');
            return self::SUCCESS;
        }

        $totalSent = 0;

        foreach ($events as $event) {
            $tickets = $event->tickets()
                ->with('event')
                ->where('status', 'confirmed')
                ->whereIn('payment_status', ['free', 'paid'])
                ->get();

            $sent = 0;
            foreach ($tickets as $ticket) {
                if (! $ticket->email) continue;
                try {
                    Notification::route('mail', $ticket->email)
                        ->notify(new RappelJourJ1Notification($ticket));
                    $sent++;
                } catch (\Throwable $e) {
                    $this->warn("Échec envoi ticket {$ticket->id} : " . $e->getMessage());
                }
            }

            // Marque l'event : idempotence — évite qu'un 2ème passage horaire
            // re-notifie tout le monde.
            $event->forceFill(['reminders_j1_sent_at' => now()])->save();

            $totalSent += $sent;
            $this->info("Event #{$event->id} \"{$event->title}\" — {$sent} rappel(s) J-1 envoyé(s).");
        }

        $this->info("✓ Total : {$totalSent} rappel(s) envoyé(s).");
        return self::SUCCESS;
    }
}
