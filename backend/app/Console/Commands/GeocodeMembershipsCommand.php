<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\MembershipRequest;
use App\Services\GeocodingService;
use Illuminate\Console\Command;

/**
 * Rattrapage géocodage : traite les MembershipRequest sans coord (ou en échec)
 * pour un event donné. Utilise Nominatim (1 req/s → ~1min pour 60 inscrits).
 *
 * Idempotent : geocoded_at est posé à chaque essai (succès OU échec) pour
 * éviter les relances infinies sur des adresses irrésolvables.
 *
 * Utilisation :
 *   php artisan geocode:memberships --event=festi-grill-26
 *   php artisan geocode:memberships --event=festi-grill-26 --retry-failed
 *   php artisan geocode:memberships --event-id=14 --limit=50
 */
class GeocodeMembershipsCommand extends Command
{
    protected $signature = 'geocode:memberships
                            {--event= : Slug de l\'event}
                            {--event-id= : ID de l\'event (alternative)}
                            {--limit=1000 : Max à traiter en une passe}
                            {--retry-failed : Re-tenter les adresses non résolues précédemment}';

    protected $description = 'Géocode les préinscrits d\'un event via Nominatim (commune + quartier → GPS).';

    public function handle(GeocodingService $geo): int
    {
        $slug = $this->option('event');
        $id   = $this->option('event-id');
        $limit = (int) $this->option('limit');
        $retry = (bool) $this->option('retry-failed');

        if (! $slug && ! $id) {
            $this->error('Passe --event=<slug> ou --event-id=<n>.');
            return self::INVALID;
        }

        $event = $id
            ? Event::find((int) $id)
            : Event::where('slug', $slug)->first();

        if (! $event) {
            $this->error("Event introuvable.");
            return self::FAILURE;
        }
        $this->info("Event : #{$event->id} — {$event->title}");

        $q = MembershipRequest::where('event_id', $event->id)
            ->whereNotNull('commune');

        if ($retry) {
            // Retente les points sans lat/lng (échec précédent OU jamais tenté)
            $q->whereNull('latitude');
        } else {
            // Défaut : seulement les jamais tentés (geocoded_at IS NULL)
            $q->whereNull('geocoded_at');
        }

        $total = $q->count();
        $this->info("À traiter : {$total} (limit {$limit})");
        if ($total === 0) { $this->line('Rien à faire.'); return self::SUCCESS; }

        $ok = 0; $failed = 0; $processed = 0;

        // chunkById → immunisé aux mutations concurrentes (comme issue-missing)
        $q->orderBy('id')->chunkById(50, function ($chunk) use (&$ok, &$failed, &$processed, $geo, $limit) {
            foreach ($chunk as $reg) {
                if ($processed >= $limit) return false;
                $processed++;

                $result = $geo->geocode($reg->commune, $reg->quartier);
                if ($result) {
                    $reg->update([
                        'latitude'        => $result['lat'],
                        'longitude'       => $result['lng'],
                        'geocoded_at'     => now(),
                        'geocoded_source' => $result['source'],
                    ]);
                    $ok++;
                    $this->line(sprintf(
                        "  ✓ %s / %s → %.4f, %.4f",
                        $reg->quartier ?: '—', $reg->commune, $result['lat'], $result['lng']
                    ));
                } else {
                    $reg->update(['geocoded_at' => now()]);
                    $failed++;
                    $this->warn("  ✗ non résolu : {$reg->quartier} / {$reg->commune}");
                }
            }
        });

        $this->newLine();
        $this->info("Résumé : résolus={$ok}  échecs={$failed}  total={$processed}");
        return self::SUCCESS;
    }
}
