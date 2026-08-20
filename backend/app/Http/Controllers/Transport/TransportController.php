<?php

namespace App\Http\Controllers\Transport;

use App\Http\Controllers\Admin\AdminEventRegistrationsController;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\MembershipRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Espace Transport — cartographie des inscrits à chaque event pour organiser
 * les navettes / covoiturage.
 *
 * Endpoints (préfixe /api/transport, middleware auth:sanctum + transport-access) :
 *   GET /events                     liste des events avec address_capture=true
 *   GET /events/{slug}              détail event : inscrits + map
 *   GET /events/{slug}/list.csv     export CSV pour terrain
 *
 * Générique : tout event dont modules_enabled.address_capture = true est
 * automatiquement pris en charge (aucun code par event).
 */
class TransportController extends Controller
{
    /** Coordonnées GPS Église La Maison de la Destinée (point central). */
    private const CHURCH_LAT = 5.362007469459559;
    private const CHURCH_LNG = -3.967743220314113;

    /** GET /transport/events */
    public function events(Request $request): JsonResponse
    {
        $events = Event::where('is_published', true)
            ->where(function ($q) {
                $q->whereJsonContains('modules_enabled->address_capture', true);
            })
            ->orderByDesc('starts_at')
            ->get()
            ->map(function ($e) {
                $count = MembershipRequest::where('event_id', $e->id)
                    ->where('source', 'event-registration')
                    ->whereNotNull('commune')
                    ->count();
                return [
                    'id'          => $e->id,
                    'slug'        => $e->slug,
                    'title'       => $e->title,
                    'starts_at'   => $e->starts_at?->toIso8601String(),
                    'ends_at'     => $e->ends_at?->toIso8601String(),
                    'location'    => $e->location,
                    'cover_image' => $e->cover_image
                        ? \Illuminate\Support\Facades\Storage::disk('public')->url($e->cover_image)
                        : null,
                    'registrations_count' => $count,
                ];
            })
            ->values();

        return response()->json(['events' => $events]);
    }

    /** GET /transport/events/{slug} */
    public function eventDetail(Request $request, string $slug): JsonResponse
    {
        $event = Event::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        // Guard : l'event doit avoir address_capture activé, sinon 404
        $modules = $event->modules_enabled ?? [];
        if (! ($modules['address_capture'] ?? false)) {
            abort(404, 'Cet événement ne collecte pas les adresses.');
        }

        $rows = MembershipRequest::where('event_id', $event->id)
            ->where('source', 'event-registration')
            ->whereNotNull('commune')
            ->orderBy('commune')
            ->orderBy('created_at')
            ->get(['id', 'first_name', 'name', 'email', 'phone', 'whatsapp',
                    'commune', 'quartier', 'interested_mountain',
                    'attended_bal', 'registration_step']);

        $centroids = AdminEventRegistrationsController::COMMUNE_CENTROIDS;

        // Répartition par commune (utile pour organiser les tournées)
        $byCommune = [];
        foreach ($rows as $r) {
            $byCommune[$r->commune] = ($byCommune[$r->commune] ?? 0) + 1;
        }
        arsort($byCommune);

        $markers = $rows->map(function ($r) use ($centroids) {
            $centroid = $centroids[$r->commune] ?? null;
            if (! $centroid) return null;
            // Jitter déterministe ±500 m pour éviter la superposition
            $jitterLat = ((($r->id * 37) % 100) - 50) / 10000;
            $jitterLng = ((($r->id * 73) % 100) - 50) / 10000;
            return [
                'id'         => $r->id,
                'lat'        => $centroid[0] + $jitterLat,
                'lng'        => $centroid[1] + $jitterLng,
                'first_name' => $r->first_name,
                'name'       => $r->name,
                'full_name'  => trim(($r->first_name ?? '') . ' ' . ($r->name ?? '')),
                'phone'      => $r->phone,
                'whatsapp'   => $r->whatsapp,
                'email'      => $r->email,
                'commune'    => $r->commune,
                'quartier'   => $r->quartier,
                'mountain'   => $r->interested_mountain,
                'attended_bal' => (bool) $r->attended_bal,
                'step'       => $r->registration_step,
            ];
        })->filter()->values();

        return response()->json([
            'event' => [
                'id'          => $event->id,
                'slug'        => $event->slug,
                'title'       => $event->title,
                'starts_at'   => $event->starts_at?->toIso8601String(),
                'ends_at'     => $event->ends_at?->toIso8601String(),
                'location'    => $event->location,
                'address'     => $event->address,
                'cover_image' => $event->cover_image
                    ? \Illuminate\Support\Facades\Storage::disk('public')->url($event->cover_image)
                    : null,
            ],
            'church' => [
                'name'    => 'Église La Maison de la Destinée',
                'address' => 'Riviera Bonoumin, Rue 65, Abidjan',
                'lat'     => self::CHURCH_LAT,
                'lng'     => self::CHURCH_LNG,
            ],
            'markers'   => $markers,
            'by_commune'=> $byCommune,
            'communes'  => array_keys($centroids), // liste pour filtre UI
            'total'     => $markers->count(),
        ]);
    }

    /** GET /transport/events/{slug}/list.csv */
    public function exportCsv(Request $request, string $slug): StreamedResponse
    {
        $event = Event::where('slug', $slug)->firstOrFail();
        $filename = 'transport-' . $event->slug . '-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(function () use ($event) {
            $out = fopen('php://output', 'w');
            // BOM UTF-8 : indispensable pour qu'Excel Windows n'affiche pas
            // "PrÃ©nom" au lieu de "Prénom" (par défaut il lit en cp1252/ANSI).
            fwrite($out, "\xEF\xBB\xBF");
            // Séparateur ";" : Excel FR l'ouvre en colonnes sans dialogue import.
            fputcsv($out, [
                'Prénom', 'Nom', 'Téléphone', 'WhatsApp', 'Email',
                'Commune', 'Quartier', 'Montagne', 'Bal-goer', 'Étape',
            ], ';');
            MembershipRequest::where('event_id', $event->id)
                ->where('source', 'event-registration')
                ->whereNotNull('commune')
                ->orderBy('commune')
                ->orderBy('created_at')
                ->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $r) {
                        fputcsv($out, [
                            $r->first_name, $r->name, $r->phone, $r->whatsapp, $r->email,
                            $r->commune, $r->quartier, $r->interested_mountain,
                            $r->attended_bal ? 'oui' : 'non',
                            $r->registration_step,
                        ], ';');
                    }
                });
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Cache-Control' => 'no-store',
        ]);
    }
}
