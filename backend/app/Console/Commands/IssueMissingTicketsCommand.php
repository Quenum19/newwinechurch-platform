<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\MembershipRequest;
use App\Services\AutoTicketIssuer;
use Illuminate\Console\Command;

/**
 * Rattrapage : émet un ticket pour toutes les préinscriptions d'un event
 * qui n'ont pas encore reçu leur ticket.
 *
 * Utilisation :
 *   php artisan tickets:issue-missing --event=festi-grill-26
 *   php artisan tickets:issue-missing --event=festi-grill-26 --dry-run
 *   php artisan tickets:issue-missing --event-id=14 --limit=100
 *
 * Idempotent : le service AutoTicketIssuer refuse de créer un doublon si un
 * ticket existe déjà (event_id, email OR phone).
 */
class IssueMissingTicketsCommand extends Command
{
    protected $signature = 'tickets:issue-missing
                            {--event= : Slug de l\'event}
                            {--event-id= : ID de l\'event (alternative au slug)}
                            {--limit=1000 : Nombre max de tickets à émettre en une passe}
                            {--dry-run : Affiche ce qui serait fait sans rien envoyer}';

    protected $description = 'Émet un ticket + envoie mail pour chaque préinscription sans ticket sur un event donné.';

    public function handle(AutoTicketIssuer $issuer): int
    {
        $slug   = $this->option('event');
        $id     = $this->option('event-id');
        $limit  = (int) $this->option('limit');
        $dry    = (bool) $this->option('dry-run');

        if (! $slug && ! $id) {
            $this->error('Passe --event=<slug> ou --event-id=<n>.');
            return self::INVALID;
        }

        $event = $id
            ? Event::find((int) $id)
            : Event::where('slug', $slug)->first();

        if (! $event) {
            $this->error("Event introuvable ({$slug}{$id}).");
            return self::FAILURE;
        }

        $this->info("Event : #{$event->id} — {$event->title}");

        // Préinscriptions sans ticket : registration_step != 'ticketed' (les 2
        // guards sont utiles car le service marque 'ticketed' à l'emission).
        $q = MembershipRequest::where('event_id', $event->id)
            ->where('source', 'event-registration')
            ->where(function ($q) {
                $q->where('registration_step', '!=', 'ticketed')
                  ->orWhereNull('registration_step');
            })
            ->whereNotNull('email')
            ->orderBy('created_at');

        $total = $q->count();
        $this->info("Préinscrits sans ticket : {$total}");

        if ($total === 0) {
            $this->line('Rien à faire.');
            return self::SUCCESS;
        }

        $sent = 0;
        $skipped = 0;
        $failed = 0;

        // ⚠ NE PAS utiliser chunk() ici : on modifie l'état (registration_step)
        // pendant l'itération, ce qui décale l'OFFSET des chunks suivants et
        // fait sauter la moitié des lignes. chunkById() pagine sur l'ID (WHERE
        // id > lastId) → immunisé aux mutations concurrentes.
        $processed = 0;
        $q->chunkById(50, function ($chunk) use (&$sent, &$skipped, &$failed, &$processed, $issuer, $event, $dry, $limit) {
            foreach ($chunk as $reg) {
                if ($processed >= $limit) return false; // signal chunkById d'arrêter
                $processed++;

                if ($dry) {
                    $this->line("  [dry] {$reg->email} — {$reg->first_name} {$reg->name}");
                    $skipped++;
                    continue;
                }
                $result = $issuer->issue($event, $reg);
                if ($result['sent']) {
                    $sent++;
                    $this->line("  ✓ envoyé → {$reg->email}");
                } else {
                    $reason = $result['reason'] ?? 'unknown';
                    if ($reason === 'already_exists') {
                        $skipped++;
                        $this->line("  · skip (existant) {$reg->email}");
                    } else {
                        $failed++;
                        $this->warn("  ✗ échec ({$reason}) {$reg->email}");
                    }
                }
            }
        });

        $this->newLine();
        $this->info("Résumé : envoyés={$sent}  ignorés={$skipped}  échecs={$failed}");
        return self::SUCCESS;
    }
}
