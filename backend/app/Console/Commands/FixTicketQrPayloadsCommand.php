<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\EventTicket;
use App\Services\QrPayloadService;
use App\Services\TicketIssuer;
use Illuminate\Console\Command;

/**
 * Rattrapage : régénère le qr_payload des tickets d'un event vers le
 * format HMAC signé (attendu par le scanner). Puis renvoie le PDF par mail.
 *
 * Cause : AutoTicketIssuer stockait un JSON brut {e:X,t:Y,v:1} comme
 * qr_payload alors que le scanner exige un HMAC signé QrPayloadService::sign().
 * Résultat : QR imprimé sur le ticket → scanner renvoie "code invalide".
 *
 * Skip auto : tickets déjà scannés (used_at != null) ou annulés/refunded.
 *
 * Utilisation :
 *   php artisan tickets:fix-qr-payloads --event=festi-grill-26           # dry-run
 *   php artisan tickets:fix-qr-payloads --event=festi-grill-26 --apply   # applique
 *   php artisan tickets:fix-qr-payloads --event=festi-grill-26 --apply --resend
 */
class FixTicketQrPayloadsCommand extends Command
{
    protected $signature = 'tickets:fix-qr-payloads
                            {--event= : Slug de l\'event}
                            {--event-id= : ID de l\'event (alternative)}
                            {--apply : Applique réellement (sinon dry-run)}
                            {--resend : Renvoie aussi le PDF par mail après régen}
                            {--limit=1000 : Max à traiter en une passe}';

    protected $description = 'Régénère qr_payload en HMAC signé (fix scanner) + renvoie PDF.';

    public function handle(QrPayloadService $qr, TicketIssuer $issuer): int
    {
        $slug = $this->option('event');
        $id   = $this->option('event-id');
        $apply  = (bool) $this->option('apply');
        $resend = (bool) $this->option('resend');
        $limit  = (int) $this->option('limit');

        if (! $slug && ! $id) {
            $this->error('Passe --event=<slug> ou --event-id=<n>.');
            return self::INVALID;
        }

        $event = $id ? Event::find((int) $id) : Event::where('slug', $slug)->first();
        if (! $event) { $this->error('Event introuvable.'); return self::FAILURE; }
        $this->info("Event : #{$event->id} — {$event->title}");

        $q = EventTicket::where('event_id', $event->id)
            ->whereNull('used_at')                // skip déjà scannés (audit)
            ->where('status', 'confirmed')        // skip annulés
            ->where('payment_status', '!=', 'refunded')
            ->orderBy('id');

        $total = $q->count();
        $this->info("À traiter : {$total} (limit {$limit})");
        if ($total === 0) return self::SUCCESS;

        if (! $apply) {
            $this->warn("Mode dry-run — passe --apply pour exécuter.");
        }

        $fixed = 0; $resent = 0; $skipped = 0; $processed = 0;

        $q->chunkById(50, function ($chunk) use (&$fixed, &$resent, &$skipped, &$processed, $qr, $issuer, $apply, $resend, $limit, $event) {
            foreach ($chunk as $t) {
                if ($processed >= $limit) return false;
                $processed++;

                $current = (string) $t->qr_payload;
                $expected = $qr->sign($t->ticket_number, $event->id);

                // Skip si déjà signé (verify réussit)
                if ($qr->verify($current)) {
                    $skipped++;
                    continue;
                }

                if (! $apply) {
                    $this->line("  [dry] {$t->email} — code #{$t->ticket_number}");
                    $fixed++;
                    continue;
                }

                $t->qr_payload = $expected;
                $t->save();
                $fixed++;
                $this->line("  ✓ QR régen → {$t->email}");

                if ($resend && $t->email) {
                    try {
                        $r = $issuer->issueAndSend($t->fresh());
                        if ($r['sent'] ?? false) {
                            $resent++;
                            $this->line("    ↳ mail renvoyé");
                        } else {
                            $this->warn("    ↳ mail échec : " . ($r['reason'] ?? 'unknown'));
                        }
                    } catch (\Throwable $e) {
                        $this->warn("    ↳ mail exception : " . $e->getMessage());
                    }
                }
            }
        });

        $this->newLine();
        $this->info("Résumé : régénérés={$fixed}  déjà OK={$skipped}  mails renvoyés={$resent}");
        if (! $apply) $this->warn("Aucun changement en base (dry-run).");
        return self::SUCCESS;
    }
}
