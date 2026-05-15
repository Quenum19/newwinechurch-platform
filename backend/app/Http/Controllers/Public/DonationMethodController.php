<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\DonationMethod;
use Illuminate\Http\JsonResponse;

/**
 * Public — Liste des méthodes de don actives (Mobile Money + autres),
 * consommée par la page /donner du frontend.
 */
class DonationMethodController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DonationMethod::active()->ordered()->get(),
        ]);
    }
}
