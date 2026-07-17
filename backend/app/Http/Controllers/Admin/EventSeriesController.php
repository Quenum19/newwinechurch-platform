<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EventSeries;
use App\Services\EventSeriesGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Phase 5 — CRUD des séries d'événements + génération d'occurrences.
 *
 *  GET    /api/admin/event-series                       → liste paginée
 *  POST   /api/admin/event-series                       → créer
 *  GET    /api/admin/event-series/{id}                  → détail (avec events)
 *  PUT    /api/admin/event-series/{id}                  → update métadonnées
 *  DELETE /api/admin/event-series/{id}                  → supprime (events restent, series_id=null)
 *  POST   /api/admin/event-series/{id}/generate         → génère N occurrences
 *  POST   /api/admin/event-series/{id}/add-occurrence   → ajoute 1 occurrence manuelle
 */
class EventSeriesController extends Controller
{
    public function __construct(private EventSeriesGenerator $generator) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('create events'), 403);
        $series = EventSeries::withCount('events')
            ->orderByDesc('created_at')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($series);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('view events'), 403);
        $series = EventSeries::with(['events' => fn ($q) => $q
            ->withCount(['tickets' => fn ($qq) => $qq->whereIn('status', ['confirmed', 'used'])
                ->whereIn('payment_status', ['free', 'pending', 'paid'])])
            ->orderBy('series_sort_order')->orderBy('starts_at')])
            ->findOrFail($id);

        return response()->json(['data' => $series]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('create events'), 403);

        $data = $this->validateData($request);
        $data['slug']       = $this->uniqueSlug($data['title']);
        $data['created_by'] = $request->user()->id;

        if ($request->hasFile('cover_image')) {
            $data['cover_image'] = $this->storeCover($request->file('cover_image'));
        }

        $series = EventSeries::create($data);
        return response()->json(['data' => $series, 'message' => 'Série créée.'], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('edit events'), 403);

        $series = EventSeries::findOrFail($id);
        $data   = $this->validateData($request, $series);

        if ($request->hasFile('cover_image')) {
            $data['cover_image'] = $this->storeCover($request->file('cover_image'));
        }

        $series->update($data);
        return response()->json(['data' => $series, 'message' => 'Série mise à jour.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('delete events'), 403);

        $series = EventSeries::findOrFail($id);
        // Cascade NULL configurée en migration → events gardent leur identité.
        $series->delete();

        return response()->json(['message' => 'Série supprimée. Les events restent en tant qu\'events indépendants.']);
    }

    public function generateOccurrences(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('create events'), 403);

        $series = EventSeries::findOrFail($id);
        $data   = $request->validate([
            'start_date' => ['required', 'date'],
            'count'      => ['required', 'integer', 'min:1', 'max:52'],
        ]);

        if ($series->recurrence_type === 'none') {
            return response()->json([
                'message' => 'Cette série n\'a pas de règle de récurrence — utilise le bouton "Ajouter une date" à la place.',
            ], 422);
        }

        try {
            $events = $this->generator->generate(
                series: $series,
                startDate: Carbon::parse($data['start_date']),
                count: $data['count'],
                creatorId: $request->user()->id,
            );
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => count($events) . ' occurrence(s) créée(s).',
            'data'    => $events,
        ], 201);
    }

    public function addOccurrence(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('create events'), 403);

        $series = EventSeries::findOrFail($id);
        $data   = $request->validate(['starts_at' => ['required', 'date']]);

        $event = $this->generator->addManualOccurrence(
            series: $series,
            startsAt: Carbon::parse($data['starts_at']),
            creatorId: $request->user()->id,
        );

        return response()->json(['data' => $event, 'message' => 'Date ajoutée.'], 201);
    }

    /* ─────────────────────────────────────────────────────────────── */

    private function validateData(Request $request, ?EventSeries $existing = null): array
    {
        $rules = [
            'title'                    => ['required', 'string', 'max:200'],
            'description'              => ['nullable', 'string', 'max:5000'],
            'recurrence_type'          => ['required', 'in:none,weekly,monthly'],
            'recurrence_day'           => ['nullable', 'integer', 'min:1', 'max:31'],
            'default_start_time'       => ['nullable', 'date_format:H:i'],
            'default_duration_minutes' => ['nullable', 'integer', 'min:15', 'max:720'],
            'default_location'         => ['nullable', 'string', 'max:200'],
            'default_address'          => ['nullable', 'string', 'max:200'],
            'is_published'             => ['nullable', 'boolean'],
            'cover_image'              => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
        ];

        // sometimes pour update (PUT partiel)
        if ($existing) {
            foreach ($rules as $k => $v) {
                if (! in_array('required', $v, true)) continue;
                array_unshift($rules[$k], 'sometimes');
            }
        }

        return $request->validate($rules);
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 1;
        while (EventSeries::where('slug', $slug)->exists()) {
            $slug = $base . '-' . (++$i);
        }
        return $slug;
    }

    private function storeCover($file): string
    {
        $disk = Storage::disk(config('filesystems.default'));
        $path = 'series/covers/' . bin2hex(random_bytes(8)) . '.' . $file->extension();
        $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);
        return $path;
    }
}
