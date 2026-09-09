<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service de géocodage adresse → GPS via Nominatim (OpenStreetMap).
 *
 * Nominatim est gratuit et public mais impose :
 *   - Rate limit : max 1 req/s (respecté via throttle)
 *   - User-Agent obligatoire, identifiant l'application (RFC)
 *   - Attribution OSM affichée dans la carte (déjà fait côté frontend)
 *   - Pas de heavy commercial use (à revoir si > 10k inscrits/event)
 *
 * Cache DB (24h) — les mêmes adresses résolvent au même point,
 * inutile de retaper l'API deux fois pour "Faya, Cocody, Abidjan".
 *
 * Fallback géographique : bounding box Côte d'Ivoire pour éviter les
 * résultats improbables (« Faya, Chad » a plus de hits sur OSM).
 */
class GeocodingService
{
    private const BASE_URL = 'https://nominatim.openstreetmap.org/search';
    private const USER_AGENT = 'NewWineChurch-Transport/1.0 (contact@newinechurch.org)';
    private const CACHE_TTL = 60 * 60 * 24; // 24h
    private const THROTTLE_KEY = 'geocoding:nominatim:last-request';

    // Bounding box Côte d'Ivoire (SW → NE) : biais géographique fort
    private const COUNTRY_BBOX = [-8.60, 4.35, -2.49, 10.75];

    /**
     * Géocode une adresse (commune + quartier). Renvoie ['lat', 'lng', 'source']
     * ou null si aucun match fiable.
     */
    public function geocode(?string $commune, ?string $quartier): ?array
    {
        $commune  = trim((string) $commune);
        $quartier = trim((string) $quartier);

        if ($commune === '' && $quartier === '') return null;

        // Cache : même clé pour toutes les variations de casse
        $cacheKey = 'geocode:' . md5(strtolower("{$quartier}|{$commune}"));
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached === false ? null : $cached; // false = "cherché mais rien"
        }

        // Ordre des essais : du plus précis au plus large
        $queries = array_values(array_filter([
            $quartier ? "{$quartier}, {$commune}, Abidjan, Côte d'Ivoire" : null,
            $quartier ? "{$quartier}, Abidjan, Côte d'Ivoire" : null,
            $commune  ? "{$commune}, Abidjan, Côte d'Ivoire"  : null,
        ]));

        foreach ($queries as $q) {
            $result = $this->query($q);
            if ($result) {
                Cache::put($cacheKey, $result, self::CACHE_TTL);
                return $result;
            }
        }

        // Résultat négatif mis en cache pour éviter le hammering
        Cache::put($cacheKey, false, self::CACHE_TTL);
        return null;
    }

    /** Une requête Nominatim + throttle 1 req/s. */
    private function query(string $q): ?array
    {
        $this->throttle();

        try {
            $resp = Http::withHeaders(['User-Agent' => self::USER_AGENT])
                ->timeout(5)
                ->get(self::BASE_URL, [
                    'q'              => $q,
                    'format'         => 'jsonv2',
                    'limit'          => 1,
                    'countrycodes'   => 'ci', // biais dur : Côte d'Ivoire uniquement
                    'addressdetails' => 0,
                ]);

            if (! $resp->successful()) {
                Log::warning('Nominatim HTTP non-2xx', [
                    'q' => $q, 'status' => $resp->status(),
                ]);
                return null;
            }

            $data = $resp->json();
            if (empty($data[0])) return null;

            $lat = (float) ($data[0]['lat'] ?? 0);
            $lng = (float) ($data[0]['lon'] ?? 0);

            // Sanity : reste dans la bbox pays. Sans ça, un match à
            // l'étranger contamine la carte.
            [$w, $s, $e, $n] = self::COUNTRY_BBOX;
            if ($lat < $s || $lat > $n || $lng < $w || $lng > $e) return null;

            return ['lat' => $lat, 'lng' => $lng, 'source' => 'nominatim'];
        } catch (\Throwable $e) {
            Log::warning('Nominatim exception', ['q' => $q, 'err' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Throttle : Nominatim exige au max 1 req/s. On dort si nécessaire.
     * Clé DB via cache pour être multi-process safe (queue workers).
     */
    private function throttle(): void
    {
        $last = Cache::get(self::THROTTLE_KEY, 0);
        $elapsed = microtime(true) - $last;
        if ($elapsed < 1.05) {
            usleep((int) ((1.05 - $elapsed) * 1_000_000));
        }
        Cache::put(self::THROTTLE_KEY, microtime(true), 60);
    }
}
