<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\DepartmentResource;
use App\Models\Cell;
use App\Models\Department;
use App\Models\MediaGallery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Contrôleur public — départements.
 *
 * Étape 5 :
 *  - show() retourne le bundle complet : département + gouverneur enrichi
 *    (profil) + cellules actives + 6 derniers médias + 3 prochains événements.
 *  - media() : pagination des médias d'un département (filtrable par type).
 */
class DepartmentController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $departments = Department::active()->ordered()
            ->with(['governor:id,name,first_name,avatar'])
            ->withCount('members')
            ->get();

        // Le frontend affiche le nombre EXACT de départements (actifs + inactifs)
        // dans le compteur, mais ne liste que les actifs dans la grille.
        return DepartmentResource::collection($departments)
            ->additional([
                'meta' => [
                    'total_count' => Department::count(),
                ],
            ]);
    }

    public function show(string $slug): JsonResponse
    {
        $department = Department::active()
            ->where('slug', $slug)
            ->with([
                'governor:id,name,first_name,avatar,bio,department_id',
                'governor.governorProfile',
            ])
            ->withCount('members')
            ->firstOrFail();

        // Cellules actives dont le leader appartient au département.
        $cells = Cell::query()
            ->whereHas('leader', fn ($q) => $q->where('department_id', $department->id))
            ->where('is_active', true)
            ->with('leader:id,first_name,name,avatar')
            ->orderBy('name')
            ->limit(12)
            ->get(['id', 'name', 'slug', 'zone', 'meeting_day', 'meeting_time', 'meeting_location', 'leader_id'])
            ->map(fn ($c) => [
                'id'                => $c->id,
                'name'              => $c->name,
                'slug'              => $c->slug,
                'zone'              => $c->zone,
                'meeting_day'       => $c->meeting_day,
                'meeting_time'      => $c->meeting_time?->format('H:i'),
                'meeting_location'  => $c->meeting_location,
                'leader_first_name' => $c->leader?->first_name,
                'leader_avatar'     => $c->leader?->avatar,
            ]);

        // 6 derniers médias du département (featured d'abord).
        // On passe par MediaGalleryResource pour avoir des URLs ABSOLUES
        // (sinon le frontend résout sur le mauvais sous-domaine → 404).
        $recentMediaCollection = MediaGallery::published()
            ->where('department_id', $department->id)
            ->orderByDesc('is_featured')
            ->orderByDesc('id')
            ->limit(6)
            ->get();
        $recentMedia = \App\Http\Resources\MediaGalleryResource::collection($recentMediaCollection)->resolve();

        // 3 prochains événements liés (via pivot event_department).
        $upcomingEvents = $department->events()
            ->upcoming()
            ->limit(3)
            ->get(['events.id', 'title', 'slug', 'description', 'starts_at', 'location', 'cover_image'])
            ->map(fn ($e) => $this->mapEvent($e));

        // 6 événements PASSÉS liés (les plus récents en premier) — pour donner
        // au visiteur l'historique des actions du département.
        $pastEvents = $department->events()
            ->past()
            ->limit(6)
            ->get(['events.id', 'title', 'slug', 'description', 'starts_at', 'location', 'cover_image'])
            ->map(fn ($e) => $this->mapEvent($e));

        return response()->json([
            'data'            => new DepartmentResource($department),
            'cells'           => $cells,
            'recent_media'    => $recentMedia,
            'upcoming_events' => $upcomingEvents,
            'past_events'     => $pastEvents,
        ]);
    }

    private function mapEvent($e): array
    {
        return [
            'id'          => $e->id,
            'title'       => $e->title,
            'slug'        => $e->slug,
            'description' => \Illuminate\Support\Str::limit($e->description, 160),
            'starts_at'   => $e->starts_at?->toIso8601String(),
            'location'    => $e->location,
            'cover_image' => $e->cover_image, // déjà URL ou path — frontend rend via STORAGE() ou direct
        ];
    }

    /** Médias paginés d'un département (filtrable par type). */
    public function media(Request $request, string $slug): AnonymousResourceCollection
    {
        $department = Department::where('slug', $slug)->firstOrFail();

        $query = MediaGallery::published()
            ->where('department_id', $department->id)
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderByDesc('id');

        if ($type = $request->query('file_type')) {
            $query->where('file_type', $type);
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        return \App\Http\Resources\MediaGalleryResource::collection($query->paginate($perPage));
    }
}
