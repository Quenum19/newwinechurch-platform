<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\SermonSeriesResource;
use App\Http\Resources\SermonResource;
use App\Models\SermonSeries;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SermonSeriesController extends Controller
{
    /** Liste de toutes les séries (actives en premier). */
    public function index(): AnonymousResourceCollection
    {
        $series = SermonSeries::query()
            ->withCount(['sermons' => fn ($q) => $q->published()])
            ->orderByDesc('is_active')
            ->orderByDesc('started_at')
            ->get();

        return SermonSeriesResource::collection($series);
    }

    /** Détail d'une série + ses sermons publiés. */
    public function show(string $slug): array
    {
        $series = SermonSeries::where('slug', $slug)
            ->withCount(['sermons' => fn ($q) => $q->published()])
            ->firstOrFail();

        $sermons = $series->sermons()->published()
            ->with([
                'speaker:id,name,first_name,avatar',
                'themes:id,slug,name,color',
            ])
            ->recent()
            ->get();

        return [
            'series'  => new SermonSeriesResource($series),
            'sermons' => SermonResource::collection($sermons),
        ];
    }
}
