<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePrayerRequestRequest;
use App\Http\Resources\PrayerRequestResource;
use App\Models\PrayerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrayerRequestController extends Controller
{
    /**
     * Soumission d'une nouvelle demande de prière (public ou auth).
     */
    public function store(StorePrayerRequestRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()?->id;

        // Si l'utilisateur est connecté, on peut récupérer son nom comme fallback.
        if ($request->user() && empty($data['name'])) {
            $data['name'] = $request->user()->first_name ?? $request->user()->name;
        }

        $prayer = PrayerRequest::create($data);

        return response()->json([
            'message' => 'Votre demande de prière a bien été reçue. Nous prierons pour vous.',
            'id'      => $prayer->id,
        ], 201);
    }

    /**
     * Mur de prière publique : seules les demandes "is_published=true".
     */
    public function publicWall(): AnonymousResourceCollection
    {
        $prayers = PrayerRequest::public()
            ->paginate(20);

        return PrayerRequestResource::collection($prayers);
    }

    /**
     * "Je prie pour cette demande" → +1 sur prayed_by_count.
     * Endpoint volontairement open (pas d'auth requise) — limité par
     * rate limiting Laravel pour éviter le spam.
     */
    public function pray(int $id): JsonResponse
    {
        $prayer = PrayerRequest::where('is_published', true)->findOrFail($id);
        $prayer->increment('prayed_by_count');

        return response()->json([
            'prayed_by_count' => $prayer->prayed_by_count,
        ]);
    }
}
