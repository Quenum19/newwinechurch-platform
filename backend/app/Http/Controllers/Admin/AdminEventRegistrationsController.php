<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\MembershipRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Onglets EventHub admin — vue des inscriptions par event.
 *
 * Réutilise la table membership_requests (source=event-registration).
 * Endpoints :
 *   GET /admin/events/{id}/registrations                → liste paginée + filtres
 *   GET /admin/events/{id}/registrations/stats          → chiffres pour recap
 *   GET /admin/events/{id}/registrations/map            → coords centroïdes commune
 *   GET /admin/events/{id}/registrations.csv            → export CSV
 *
 * Filtres liste : mountain, commune, step, attended_bal, search
 */
class AdminEventRegistrationsController extends Controller
{
    /** Centroïdes des 13 communes d'Abidjan (approximatifs, précis à ~1 km). */
    public const COMMUNE_CENTROIDS = [
        'Abobo'       => [5.4372, -4.0212],
        'Adjamé'      => [5.3671, -4.0248],
        'Anyama'      => [5.4949, -4.0512],
        'Attecoubé'   => [5.3311, -4.0392],
        'Bingerville' => [5.3556, -3.8843],
        'Cocody'      => [5.3717, -3.9928],
        'Koumassi'    => [5.2892, -3.9558],
        'Marcory'     => [5.2953, -3.9856],
        'Plateau'     => [5.3197, -4.0197],
        'Port-Bouët'  => [5.2469, -3.9308],
        'Songon'      => [5.3053, -4.2311],
        'Treichville' => [5.2919, -4.0067],
        'Yopougon'    => [5.3450, -4.0834],
    ];

    /** GET /admin/events/{id}/registrations */
    public function index(Request $request, int $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        $perPage = min((int) $request->query('per_page', 30), 200);

        $q = MembershipRequest::where('event_id', $id)
            ->where('source', 'event-registration')
            ->latest();

        if ($mountain = $request->query('mountain')) $q->where('interested_mountain', $mountain);
        if ($commune = $request->query('commune'))   $q->where('commune', $commune);
        if ($step = $request->query('step'))         $q->where('registration_step', $step);
        if ($request->has('attended_bal')) {
            $q->where('attended_bal', $request->boolean('attended_bal'));
        }
        if ($search = $request->query('search')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('first_name', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json($q->paginate($perPage));
    }

    /** GET /admin/events/{id}/registrations/stats */
    public function stats(Request $request, int $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        $base = MembershipRequest::where('event_id', $id)->where('source', 'event-registration');

        $total          = (clone $base)->count();
        $balGoers       = (clone $base)->where('attended_bal', true)->count();
        $newComers      = $total - $balGoers;
        $chose          = (clone $base)->where('registration_step', 'chose')->count();
        $ticketed       = (clone $base)->where('registration_step', 'ticketed')->count();

        $byMountain = (clone $base)
            ->whereNotNull('interested_mountain')
            ->selectRaw('interested_mountain as mountain, COUNT(*) as count')
            ->groupBy('interested_mountain')
            ->pluck('count', 'mountain')
            ->all();

        $byCommune = (clone $base)
            ->whereNotNull('commune')
            ->selectRaw('commune, COUNT(*) as count')
            ->groupBy('commune')
            ->orderByDesc('count')
            ->pluck('count', 'commune')
            ->all();

        $byStep = (clone $base)
            ->selectRaw('registration_step as step, COUNT(*) as count')
            ->groupBy('registration_step')
            ->pluck('count', 'step')
            ->all();

        return response()->json([
            'total'       => $total,
            'bal_goers'   => $balGoers,
            'newcomers'   => $newComers,
            'chose'       => $chose,
            'ticketed'    => $ticketed,
            'by_mountain' => $byMountain,
            'by_commune'  => $byCommune,
            'by_step'     => $byStep,
        ]);
    }

    /**
     * GET /admin/events/{id}/registrations/map
     * Renvoie les inscrits géocodés au centroïde de leur commune.
     * Petit jitter aléatoire pour éviter que N marqueurs se superposent
     * exactement au même point (rendu Leaflet illisible sinon).
     */
    public function map(Request $request, int $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        $rows = MembershipRequest::where('event_id', $id)
            ->where('source', 'event-registration')
            ->whereNotNull('commune')
            ->get(['id', 'first_name', 'name', 'phone', 'whatsapp', 'commune', 'quartier',
                    'interested_mountain', 'attended_bal', 'registration_step']);

        $markers = $rows->map(function ($r) {
            $centroid = self::COMMUNE_CENTROIDS[$r->commune] ?? null;
            if (! $centroid) return null;
            // Jitter ±0.005° (~500 m) déterministe à partir de l'ID.
            $jitterLat = ((($r->id * 37) % 100) - 50) / 10000;
            $jitterLng = ((($r->id * 73) % 100) - 50) / 10000;
            return [
                'id'         => $r->id,
                'lat'        => $centroid[0] + $jitterLat,
                'lng'        => $centroid[1] + $jitterLng,
                'name'       => trim(($r->first_name ?? '') . ' ' . ($r->name ?? '')),
                'phone'      => $r->phone,
                'whatsapp'   => $r->whatsapp,
                'commune'    => $r->commune,
                'quartier'   => $r->quartier,
                'mountain'   => $r->interested_mountain,
                'attended_bal' => (bool) $r->attended_bal,
                'step'       => $r->registration_step,
            ];
        })->filter()->values();

        return response()->json([
            'center'    => [5.3600, -4.0083], // centre Abidjan
            'zoom'      => 11,
            'markers'   => $markers,
            'communes'  => array_map(fn ($c) => ['name' => $c[0], 'lat' => $c[1][0], 'lng' => $c[1][1]],
                             array_map(null, array_keys(self::COMMUNE_CENTROIDS), array_values(self::COMMUNE_CENTROIDS))),
        ]);
    }

    /** GET /admin/events/{id}/registrations.csv */
    public function exportCsv(Request $request, int $id): StreamedResponse
    {
        $event = Event::findOrFail($id);
        $filename = 'nwc-' . $event->slug . '-inscriptions-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(function () use ($id) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'WhatsApp',
                'Commune', 'Quartier', 'Montagne', 'Bal-goer', 'Étape',
                'Créé le',
            ]);
            MembershipRequest::where('event_id', $id)
                ->where('source', 'event-registration')
                ->orderBy('id')
                ->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $r) {
                        fputcsv($out, [
                            $r->id, $r->first_name, $r->name, $r->email, $r->phone, $r->whatsapp,
                            $r->commune, $r->quartier, $r->interested_mountain,
                            $r->attended_bal ? 'oui' : 'non',
                            $r->registration_step,
                            $r->created_at?->format('Y-m-d H:i'),
                        ]);
                    }
                });
            fclose($out);
        }, $filename, [
            'Content-Type'  => 'text/csv; charset=utf-8',
            'Cache-Control' => 'no-store',
        ]);
    }
}
