<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\SermonResource;
use App\Models\Sermon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Contrôleur public — sermons.
 *
 * Endpoints :
 *  GET /api/sermons              → liste paginée des sermons publiés (filtres)
 *  GET /api/sermons/{slug}       → détail + incrément des vues
 *  GET /api/sermons/featured     → sermons mis en avant (page d'accueil)
 */
class SermonController extends Controller
{
    /**
     * Liste paginée des sermons publiés.
     * Filtres : ?type=audio|video, ?series=slug, ?search=mot-clé.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 12), 50);

        $query = Sermon::published()
            ->with(['speaker:id,name,first_name,avatar', 'series:id,title,slug'])
            ->recent();

        // Filtre type (audio/video/live_replay).
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        // Filtre série (par slug).
        if ($seriesSlug = $request->query('series')) {
            $query->whereHas('series', fn ($q) => $q->where('slug', $seriesSlug));
        }

        // Recherche fulltext sur titre + description.
        if ($search = trim((string) $request->query('search'))) {
            // FullText MATCH AGAINST si possible, sinon LIKE pour fallback.
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('scripture_reference', 'like', "%{$search}%");
            });
        }

        return SermonResource::collection($query->paginate($perPage));
    }

    /**
     * Détail d'un sermon par slug + incrément du compteur de vues.
     */
    public function show(string $slug)
    {
        $sermon = Sermon::published()
            ->where('slug', $slug)
            ->with(['speaker:id,name,first_name,avatar,bio', 'series:id,title,slug,description'])
            ->firstOrFail();

        // Incrément non bloquant (sans toucher updated_at).
        $sermon->recordView();

        return new SermonResource($sermon);
    }

    /**
     * Sermons mis en avant pour la page d'accueil (max 6).
     */
    public function featured(): AnonymousResourceCollection
    {
        $sermons = Sermon::published()->featured()
            ->with(['speaker:id,name,first_name,avatar', 'series:id,title,slug'])
            ->recent()
            ->limit(6)
            ->get();

        return SermonResource::collection($sermons);
    }
}
