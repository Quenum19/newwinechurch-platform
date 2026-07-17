<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Concerns\FormatsStorageUrls;
use App\Models\EventSeries;
use Illuminate\Http\JsonResponse;

/**
 * Phase 5 — Endpoints publics séries d'événements.
 *
 *  GET /api/series              → liste séries publiées (avec compteurs occurrences)
 *  GET /api/series/{slug}       → détail série + toutes les occurrences à venir
 */
class EventSeriesController extends Controller
{
    use FormatsStorageUrls;

    public function index(): JsonResponse
    {
        $series = EventSeries::published()
            ->whereHas('events', fn ($q) => $q->where('starts_at', '>=', now())
                ->where('is_published', true))
            ->with(['events' => fn ($q) => $q->where('starts_at', '>=', now())
                ->where('is_published', true)
                ->orderBy('starts_at')])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $series->map(fn ($s) => [
                'id'                    => $s->id,
                'title'                 => $s->title,
                'slug'                  => $s->slug,
                'description'           => $s->description,
                'cover_image'           => $this->fullStorageUrl($s->cover_image),
                'recurrence_type'       => $s->recurrence_type,
                'default_location'      => $s->default_location,
                'upcoming_count'        => $s->events->count(),
                'next_event'            => $s->events->first() ? [
                    'id'        => $s->events->first()->id,
                    'slug'      => $s->events->first()->slug,
                    'starts_at' => $s->events->first()->starts_at?->toIso8601String(),
                ] : null,
            ]),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $series = EventSeries::published()
            ->where('slug', $slug)
            ->with(['events' => fn ($q) => $q->where('is_published', true)
                ->orderBy('starts_at')])
            ->firstOrFail();

        return response()->json([
            'series' => [
                'id'                => $series->id,
                'title'             => $series->title,
                'slug'              => $series->slug,
                'description'       => $series->description,
                'cover_image'       => $this->fullStorageUrl($series->cover_image),
                'recurrence_type'   => $series->recurrence_type,
                'default_location'  => $series->default_location,
                'default_address'   => $series->default_address,
            ],
            'occurrences' => $series->events->map(fn ($event) => [
                'id'                 => $event->id,
                'title'              => $event->title,
                'slug'               => $event->slug,
                'starts_at'          => $event->starts_at?->toIso8601String(),
                'ends_at'            => $event->ends_at?->toIso8601String(),
                'location'           => $event->location,
                'is_past'            => $event->starts_at?->isPast(),
                'ticketing_enabled'  => (bool) $event->ticketing_enabled,
                'tickets_capacity'   => $event->tickets_capacity,
                'tickets_sold'       => $event->ticketing_enabled ? $event->tickets_sold : null,
                'tickets_remaining'  => $event->ticketing_enabled ? $event->tickets_remaining : null,
                'is_open'            => $event->ticketing_enabled ? $event->ticketing_is_open : false,
            ]),
        ]);
    }
}
