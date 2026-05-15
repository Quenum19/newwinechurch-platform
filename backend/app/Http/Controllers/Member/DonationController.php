<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Http\Requests\Member\StoreDonationRequest;
use App\Http\Resources\DonationResource;
use App\Models\Donation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Contrôleur Don côté membre :
 *  - POST /api/donations         → soumission (auth ou guest)
 *  - GET  /api/me/donations      → historique du membre connecté
 *
 * Workflow déclaratif Mobile Money :
 *  1. Membre paie via son app Mobile Money
 *  2. Soumet le formulaire avec montant, méthode, référence (SMS)
 *  3. Don créé en status='pending'
 *  4. Admin vérifie la référence et confirme dans /admin/dons
 *
 * Sécurité :
 *  - Référence unique (anti-doublon)
 *  - Tout en transaction DB
 *  - Throttle public 10/min (cf api.php)
 */
class DonationController extends Controller
{
    /**
     * Soumission d'un don.
     */
    public function store(StoreDonationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $userId = $request->user()?->id;

        $donation = DB::transaction(function () use ($data, $userId) {
            return Donation::create([
                'user_id'     => $userId,
                'amount'      => $data['amount'],
                'currency'    => $data['currency'] ?? 'XOF',
                'method'      => $data['method'],
                'reference'   => $data['reference'] ?? null,
                'type'        => $data['type'] ?? 'offering',
                'status'      => 'pending',
                'donor_name'  => $data['donor_name'] ?? null,
                'donor_phone' => $data['donor_phone'] ?? null,
                'note'        => $data['note'] ?? null,
            ]);
        });

        // TODO Phase 8 : queue notification email à l'admin.

        return response()->json([
            'message'  => 'Don enregistré. Notre équipe va vérifier votre référence.',
            'donation' => new DonationResource($donation),
        ], 201);
    }

    /**
     * Historique des dons du membre connecté.
     * Paginé pour scalabilité (un membre fidèle peut avoir des centaines de dons).
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 20), 100);

        $donations = $request->user()->donations()
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return DonationResource::collection($donations);
    }

    /**
     * Détail d'un don du membre (lecture seule).
     */
    public function show(Request $request, int $id): DonationResource
    {
        $donation = Donation::where('user_id', $request->user()->id)
            ->findOrFail($id);

        return new DonationResource($donation);
    }
}
