<?php

namespace App\Jobs;

use App\Models\MembershipRequest;
use App\Services\GeocodingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Job asynchrone : géocode une préinscription juste après sa création.
 *
 * Sans queue configurée (QUEUE_CONNECTION=sync), il s'exécute inline avec
 * un timeout court côté HTTP — ok pour ~2s d'attente supplémentaire à la
 * soumission du formulaire.
 *
 * Avec queue (redis / database), il tourne en arrière-plan → réponse HTTP
 * instantanée, marker mis à jour à la prochaine visite de la carte transport.
 */
class GeocodeMembershipJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 15;

    public function __construct(public int $membershipId) {}

    public function handle(GeocodingService $geo): void
    {
        $reg = MembershipRequest::find($this->membershipId);
        if (! $reg) return;

        // Skip si déjà géocodé (idempotent)
        if ($reg->geocoded_at !== null) return;

        $result = $geo->geocode($reg->commune, $reg->quartier);
        if ($result) {
            $reg->update([
                'latitude'        => $result['lat'],
                'longitude'       => $result['lng'],
                'geocoded_at'     => now(),
                'geocoded_source' => $result['source'],
            ]);
        } else {
            // Marque comme tenté même en échec pour éviter les relances infinies
            $reg->update(['geocoded_at' => now()]);
        }
    }
}
