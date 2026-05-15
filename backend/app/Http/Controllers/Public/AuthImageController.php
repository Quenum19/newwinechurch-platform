<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\AuthImage;
use Illuminate\Http\JsonResponse;

/**
 * Endpoint public — Retourne UNE image au hasard parmi les actives.
 * Appelé à chaque chargement des pages connexion / inscription.
 */
class AuthImageController extends Controller
{
    public function random(): JsonResponse
    {
        $image = AuthImage::active()->inRandomOrder()->first();

        if (! $image) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'url'        => $image->url,
                'title'      => $image->title,
                'verse_ref'  => $image->verse_ref,
                'verse_text' => $image->verse_text,
            ],
        ]);
    }
}
