<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\EventTicketWaitlist;
use App\Services\QrPayloadService;
use App\Services\TicketCodeGenerator;
use App\Services\TicketIssuer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Bascule toutes les entrées en liste d'attente d'un event en tickets confirmés.
 *
 * Utilité : contourne l'UI/API quand un bug bloque le bouton 'Basculer'.
 * Le mail est envoyé si SMTP dispo, sinon on continue quand même (les tickets
 * restent créés en BDD, tu pourras renvoyer manuellement plus tard).
 *
 * Usage :
 *   php artisan nwc:waitlist:convert-all --event=3
 *   php artisan nwc:waitlist:convert-all --event=3 --no-mail   (skip mail)
 *   php artisan nwc:waitlist:convert-all --event=3 --dry-run   (simule sans écrire)
 */
class WaitlistConvertAll extends Command
{
    protected $signature = 'nwc:waitlist:convert-all
                            {--event= : ID de l\'event (obligatoire)}
                            {--no-mail : Ne pas envoyer les emails (uniquement créer les tickets)}
                            {--dry-run : Affiche ce qui serait fait, n\'écrit rien}';

    protected $description = 'Bascule toutes les entrées waitlist d\'un event en tickets confirmés (bypass API/UI)';

    public function handle(): int
    {
        $eventId = (int) $this->option('event');
        if (! $eventId) {
            $this->error("--event=X est obligatoire");
            return self::FAILURE;
        }

        $event = Event::find($eventId);
        if (! $event) {
            $this->error("Event {$eventId} introuvable.");
            return self::FAILURE;
        }

        $entries = EventTicketWaitlist::where('event_id', $eventId)
            ->where('status', 'waiting')
            ->orderBy('position')
            ->get();

        if ($entries->isEmpty()) {
            $this->info("Aucune personne en attente pour l'event '{$event->title}'.");
            return self::SUCCESS;
        }

        $this->info("Event : {$event->title} (id={$event->id})");
        $this->info("Capacité : {$event->tickets_capacity} | Vendus : {$event->tickets_sold}");
        $this->info("File d'attente : {$entries->count()} personne(s)");
        $this->newLine();

        if ($this->option('dry-run')) {
            $this->warn('MODE DRY-RUN — aucune écriture');
            foreach ($entries as $e) {
                $this->line("  → {$e->first_name} {$e->last_name} ({$e->email}) — {$e->quantity} place(s)");
            }
            return self::SUCCESS;
        }

        if (! $this->confirm("Confirmer la bascule de {$entries->count()} personne(s) en tickets ?", true)) {
            $this->warn('Annulé.');
            return self::SUCCESS;
        }

        $codes  = app(TicketCodeGenerator::class);
        $qr     = app(QrPayloadService::class);
        $issuer = app(TicketIssuer::class);
        $sendMail = ! $this->option('no-mail');

        $convertedCount = 0;
        $ticketsCreated = 0;
        $mailsSent = 0;
        $mailsFailed = 0;
        $skipped = [];

        $bar = $this->output->createProgressBar($entries->count());
        $bar->start();

        foreach ($entries as $entry) {
            $event->refresh();

            // Vérif capacité
            if ($event->tickets_capacity && ($event->tickets_sold + $entry->quantity) > $event->tickets_capacity) {
                $skipped[] = "{$entry->first_name} {$entry->last_name} (capacité insuffisante)";
                $bar->advance();
                continue;
            }

            $orderCode = $codes->newOrderCode();
            $tickets = [];

            try {
                DB::transaction(function () use ($entry, $event, $codes, $qr, $orderCode, &$tickets) {
                    for ($i = 0; $i < $entry->quantity; $i++) {
                        $tn = $codes->newTicketNumber();
                        $tickets[] = EventTicket::create([
                            'event_id'       => $event->id,
                            'order_code'     => $orderCode,
                            'ticket_number'  => $tn,
                            'short_code'     => $codes->newShortCode(),
                            'qr_payload'     => $qr->sign($tn, $event->id),
                            'access_token'   => $codes->newAccessToken(),
                            'first_name'     => $entry->first_name,
                            'last_name'      => $entry->last_name,
                            'email'          => $entry->email,
                            'phone'          => $entry->phone,
                            'status'         => 'confirmed',
                            'payment_status' => 'free',
                        ]);
                    }
                    $entry->update(['status' => 'promoted']);
                });
            } catch (\Throwable $e) {
                $skipped[] = "{$entry->first_name} {$entry->last_name} (erreur BDD: " . $e->getMessage() . ')';
                $bar->advance();
                continue;
            }

            $convertedCount++;
            $ticketsCreated += count($tickets);

            // Envoi mail — chaque échec loggé, jamais fatal
            if ($sendMail) {
                foreach ($tickets as $t) {
                    try {
                        $r = $issuer->issueAndSend($t);
                        if (! empty($r['sent'])) $mailsSent++;
                        else $mailsFailed++;
                    } catch (\Throwable $e) {
                        $mailsFailed++;
                        \Log::warning('WaitlistConvertAll issueAndSend failed', [
                            'ticket_id' => $t->id,
                            'err'       => $e->getMessage(),
                        ]);
                    }
                }
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // Récap
        $this->info('════════════════════════════════════');
        $this->info("  ✅ {$convertedCount} personne(s) converties");
        $this->info("  🎫 {$ticketsCreated} ticket(s) créés");
        if ($sendMail) {
            $this->info("  📧 {$mailsSent} email(s) envoyés / " . ($mailsSent + $mailsFailed) . " tentés");
            if ($mailsFailed > 0) {
                $this->warn("  ⚠  {$mailsFailed} email(s) NON envoyés — les tickets sont créés, tu peux renvoyer via l'admin.");
            }
        } else {
            $this->warn("  📭 Mails non envoyés (--no-mail) — utilise l'admin pour renvoyer plus tard.");
        }
        if (! empty($skipped)) {
            $this->warn('  ⚠  ' . count($skipped) . ' personne(s) skippée(s) :');
            foreach ($skipped as $s) $this->line("     - {$s}");
        }
        $this->newLine();

        return self::SUCCESS;
    }
}
