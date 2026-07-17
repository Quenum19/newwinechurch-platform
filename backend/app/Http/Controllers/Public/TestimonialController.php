<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\TestimonialResource;
use App\Models\Testimonial;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Endpoint public — témoignages publiés.
 *
 * Le frontend (Home + page dédiée /temoignages plus tard) consomme cet endpoint.
 * Featured d'abord, puis sort_order, puis date récente.
 */
class TestimonialController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $items = Testimonial::published()
            ->orderByDesc('is_featured')
            ->ordered()
            ->limit(20)
            ->get();

        return TestimonialResource::collection($items);
    }
}
