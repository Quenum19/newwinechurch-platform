<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreEventRequest;
use App\Http\Requests\Admin\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventsController extends Controller
{
    use HandlesImageUpload;

    public function index(Request $request): AnonymousResourceCollection
    {
        if (! $request->user()->can('view events')) abort(403);

        $perPage = min((int) $request->query('per_page', 20), 100);

        $query = Event::query()
            ->withCount(['registrations' => fn ($q) => $q->where('status', 'registered')]);

        if ($request->boolean('trashed')) $query->onlyTrashed();
        if ($status = $request->query('status')) {
            $query->where('is_published', $status === 'published');
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($when = $request->query('when')) {
            if ($when === 'upcoming') $query->where('starts_at', '>=', now());
            if ($when === 'past') $query->where('starts_at', '<', now());
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where('title', 'like', "%{$search}%");
        }
        if ($request->filled('ticketing_enabled')) {
            $query->where('ticketing_enabled', $request->boolean('ticketing_enabled'));
        }

        $sort = (string) $request->query('sort', 'starts_at');
        $allowed = ['starts_at', 'title', 'created_at'];
        if (! in_array($sort, $allowed, true)) $sort = 'starts_at';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        return EventResource::collection($query->paginate($perPage));
    }

    public function show(int $id): EventResource
    {
        $event = Event::withTrashed()
            ->withCount([
                'registrations' => fn ($q) => $q->where('status', 'registered'),
                'media as media_count' => fn ($q) => $q->where('is_published', true),
            ])
            ->findOrFail($id);
        return new EventResource($event);
    }

    public function store(StoreEventRequest $request): JsonResponse
    {
        $data = $request->safe()->except(['cover_image']);
        $data['created_by'] = $request->user()->id;

        $event = Event::create($data);

        if ($request->hasFile('cover_image')) {
            $this->dispatchImageProcessing(
                model: $event,
                file: $request->file('cover_image'),
                attribute: 'cover_image',
                targetDir: 'events/covers',
                options: ['max_width' => 1920, 'max_height' => 1080],
            );
        }

        return response()->json([
            'message' => 'Événement créé.',
            'data'    => new EventResource($event),
        ], 201);
    }

    public function update(UpdateEventRequest $request, int $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        $event->fill($request->safe()->except(['cover_image']))->save();

        if ($request->hasFile('cover_image')) {
            $this->dispatchImageProcessing(
                model: $event,
                file: $request->file('cover_image'),
                attribute: 'cover_image',
                targetDir: 'events/covers',
                options: ['max_width' => 1920, 'max_height' => 1080],
            );
        }

        return response()->json(['data' => new EventResource($event->fresh())]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete events')) abort(403);
        Event::findOrFail($id)->delete();
        return response()->json(['message' => 'Événement archivé.']);
    }

    /** Action en lot. action: publish|unpublish|delete|feature|unfeature */
    public function bulk(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['required', 'in:publish,unpublish,delete,feature,unfeature'],
            'ids'    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'  => ['integer'],
        ]);
        $user = $request->user();
        $perm = in_array($request->action, ['publish', 'unpublish']) ? 'publish events'
              : ($request->action === 'delete' ? 'delete events' : 'edit events');
        abort_unless($user?->can($perm), 403);

        $ids = $request->input('ids');
        $a = $request->input('action');

        $count = match ($a) {
            'publish'   => Event::whereIn('id', $ids)->update(['is_published' => true]),
            'unpublish' => Event::whereIn('id', $ids)->update(['is_published' => false]),
            'feature'   => Event::whereIn('id', $ids)->update(['is_featured' => true]),
            'unfeature' => Event::whereIn('id', $ids)->update(['is_featured' => false]),
            'delete'    => Event::whereIn('id', $ids)->delete(),
        };
        $labels = ['publish' => 'publié(s)', 'unpublish' => 'dépublié(s)', 'feature' => 'mis en avant', 'unfeature' => 'retiré(s) de la mise en avant', 'delete' => 'archivé(s)'];
        return response()->json(['message' => "$count événement(s) " . $labels[$a] . '.', 'count' => $count]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete events')) abort(403);
        $event = Event::onlyTrashed()->findOrFail($id);
        $event->restore();
        return response()->json(['message' => 'Événement restauré.']);
    }

    /**
     * Bascule rapide de publication. Capture l'état AVANT update sinon
     * la valeur dérivée serait fausse (même bug évité dans togglePublish des
     * sermons).
     */
    public function togglePublish(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('publish events')) abort(403);

        $event = Event::findOrFail($id);
        $wasPublished = (bool) $event->is_published;

        $event->update(['is_published' => ! $wasPublished]);

        return response()->json([
            'message' => $wasPublished ? 'Événement dépublié.' : 'Événement publié.',
            'data'    => new EventResource($event->fresh()),
        ]);
    }

    /** Liste des inscrits à un événement. */
    public function registrations(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage event registrations')) abort(403);

        $event = Event::findOrFail($id);
        $perPage = min((int) $request->query('per_page', 50), 200);

        $registrations = $event->registrations()
            ->with('user:id,name,first_name,email,phone,avatar,city')
            ->where('status', '!=', 'cancelled')
            ->orderByDesc('registered_at')
            ->paginate($perPage);

        return response()->json([
            'event' => [
                'id'             => $event->id,
                'title'          => $event->title,
                'starts_at'      => $event->starts_at?->toIso8601String(),
                'max_attendees'  => $event->max_attendees,
                'registered_count' => $event->registrations()->where('status', 'registered')->count(),
                'attended_count'   => $event->registrations()->where('status', 'attended')->count(),
            ],
            'registrations' => $registrations,
        ]);
    }

    /** Marquer un inscrit comme "présent" (check-in). */
    public function markAttended(Request $request, int $id, int $userId): JsonResponse
    {
        if (! $request->user()->can('manage event registrations')) abort(403);

        $registration = EventRegistration::where('event_id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $registration->update(['status' => 'attended']);
        return response()->json(['message' => 'Marqué présent.']);
    }
}
