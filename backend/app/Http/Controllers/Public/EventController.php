<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Contrôleur public — événements.
 */
class EventController extends Controller
{
    /**
     * Liste des événements (paginée).
     * Par défaut : à venir. Filtres : ?past=1, ?type=culte, ?featured=1.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 12), 50);

        $query = $request->boolean('past')
            ? Event::past()
            : Event::upcoming();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        $query->withCount(['registrations' => fn ($q) => $q->where('status', 'registered')]);

        return EventResource::collection($query->paginate($perPage));
    }

    /** Détail d'un événement par slug. */
    public function show(string $slug)
    {
        $event = Event::published()
            ->where('slug', $slug)
            ->withCount(['registrations' => fn ($q) => $q->where('status', 'registered')])
            ->firstOrFail();

        return new EventResource($event);
    }
}
