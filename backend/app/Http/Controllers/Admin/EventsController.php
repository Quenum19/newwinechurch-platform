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
            ->withCount(['registrations' => fn ($q) => $q->where('status', 'registered')])
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
