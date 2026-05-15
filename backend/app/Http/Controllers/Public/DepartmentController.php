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

        return DepartmentResource::collection($departments);
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
        $recentMedia = MediaGallery::published()
            ->where('department_id', $department->id)
            ->orderByDesc('is_featured')
            ->orderByDesc('id')
            ->limit(6)
            ->get(['id', 'title', 'file_path', 'file_type', 'thumbnail', 'is_featured']);

        // 3 prochains événements liés (via pivot event_department).
        $upcomingEvents = $department->events()
            ->upcoming()
            ->limit(3)
            ->get(['events.id', 'title', 'slug', 'description', 'starts_at', 'location', 'cover_image'])
            ->map(fn ($e) => [
                'id'          => $e->id,
                'title'       => $e->title,
                'slug'        => $e->slug,
                'description' => \Illuminate\Support\Str::limit($e->description, 160),
                'starts_at'   => $e->starts_at?->toIso8601String(),
                'location'    => $e->location,
                'cover_image' => $e->cover_image,
            ]);

        return response()->json([
            'data'            => new DepartmentResource($department),
            'cells'           => $cells,
            'recent_media'    => $recentMedia,
            'upcoming_events' => $upcomingEvents,
        ]);
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
        return JsonResource::collection($query->paginate($perPage));
    }
}
