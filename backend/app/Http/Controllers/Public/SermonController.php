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
            ->with([
                'speaker:id,name,first_name,avatar',
                'series:id,title,slug',
                'themes:id,slug,name,color',
            ])
            ->recent();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($seriesSlug = $request->query('series')) {
            $query->whereHas('series', fn ($q) => $q->where('slug', $seriesSlug));
        }

        // Filtre thème (slug). Plusieurs slugs séparés par virgule = OU logique.
        if ($themeSlug = $request->query('theme')) {
            $slugs = array_filter(array_map('trim', explode(',', $themeSlug)));
            if (! empty($slugs)) {
                $query->whereHas('themes', fn ($q) => $q->whereIn('sermon_themes.slug', $slugs));
            }
        }

        // Filtre année (cohérent avec "retrouver un message en 2046").
        if ($year = $request->query('year')) {
            $query->whereYear('sermon_date', (int) $year);
        }

        // Filtre prédicateur : interne (slug user) OU invité (texte libre).
        if ($speaker = $request->query('speaker')) {
            $query->where(function ($q) use ($speaker) {
                $q->whereHas('speaker', fn ($q2) =>
                    $q2->where('users.name', 'like', "%{$speaker}%")
                       ->orWhere('users.first_name', 'like', "%{$speaker}%")
                )->orWhere('external_speaker_name', 'like', "%{$speaker}%");
            });
        }

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('scripture_reference', 'like', "%{$search}%")
                  ->orWhere('external_speaker_name', 'like', "%{$search}%");
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
            ->with([
                'speaker:id,name,first_name,avatar,bio',
                'series:id,title,slug,description,cover_image',
                'themes:id,slug,name,color',
            ])
            ->firstOrFail();

        // Incrément non bloquant (sans toucher updated_at).
        $sermon->recordView();

        return new SermonResource($sermon);
    }

    /**
     * Sermons mis en avant pour la page d'accueil (max 6).
     *
     * Fallback : si aucun sermon n'a `is_featured = true`, on retourne le
     * dernier sermon publié — sinon la home affiche "le prochain message
     * arrive" alors qu'il y a déjà des messages publiés.
     */
    public function featured(): AnonymousResourceCollection
    {
        $sermons = Sermon::published()->featured()
            ->with([
                'speaker:id,name,first_name,avatar',
                'series:id,title,slug',
                'themes:id,slug,name,color',
            ])
            ->recent()
            ->limit(6)
            ->get();

        if ($sermons->isEmpty()) {
            $sermons = Sermon::published()
                ->with(['speaker:id,name,first_name,avatar', 'series:id,title,slug'])
                ->recent()
                ->limit(1)
                ->get();
        }

        return SermonResource::collection($sermons);
    }
}
