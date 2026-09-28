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
     *
     * Filtres :
     *   ?scope=upcoming  → à venir uniquement (défaut historique)
     *   ?scope=past      → passés uniquement
     *   ?scope=all       → tous, triés intelligemment : à venir en premier
     *                      (les plus proches d'abord), puis passés (récents
     *                      d'abord). C'est la vue "agenda complet" pour le
     *                      visiteur qui veut tout voir d'un coup.
     *   ?past=1          → rétrocompat avec l'ancien front (= scope=past)
     *   ?type=culte, ?featured=1
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 12), 50);

        // Détermine le scope. Rétrocompat past=1 → past.
        $scope = (string) $request->query('scope', $request->boolean('past') ? 'past' : 'upcoming');

        $query = match ($scope) {
            'past'     => Event::past(),
            'all'      => Event::query()->where('is_published', true),
            default    => Event::upcoming(),
        };

        // Tri intelligent pour "all" : à venir en proximité ASC, passés en récence DESC.
        if ($scope === 'all') {
            // MySQL : ORDER BY (CASE WHEN starts_at >= NOW() THEN 0 ELSE 1 END), ...
            $query->orderByRaw('CASE WHEN starts_at >= NOW() THEN 0 ELSE 1 END ASC')
                  ->orderByRaw('CASE WHEN starts_at >= NOW() THEN starts_at END ASC')
                  ->orderByRaw('CASE WHEN starts_at < NOW() THEN starts_at END DESC');
        }

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
            ->withCount([
                'registrations' => fn ($q) => $q->where('status', 'registered'),
                // Compteur médias publiés — utile au frontend pour décider d'afficher
                // ou non le bouton "Voir la galerie de l'événement".
                'media as media_count' => fn ($q) => $q->where('is_published', true),
            ])
            ->firstOrFail();

        return new EventResource($event);
    }
}
