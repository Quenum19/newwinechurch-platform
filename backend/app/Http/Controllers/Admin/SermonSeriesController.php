<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\SermonSeriesResource;
use App\Models\SermonSeries;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Admin → Séries de sermons (CRUD complet).
 *
 * Une série regroupe plusieurs messages d'un fil thématique narratif
 * ("Identité en Christ vol.1", "Convention 2026", "Les paraboles", etc.).
 * Pilier de l'archivage long terme — un sermon retrouvé via sa série dans
 * 20 ans reste contextualisé (place dans la collection, ordre logique).
 */
class SermonSeriesController extends Controller
{
    use HandlesImageUpload;

    public function index(Request $request): AnonymousResourceCollection
    {
        if (! $request->user()->can('manage sermon series')) abort(403);

        $perPage = min((int) $request->query('per_page', 30), 100);

        $query = SermonSeries::query()->withCount('sermons');

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $sort = (string) $request->query('sort', 'started_at');
        $allowed = ['title', 'started_at', 'created_at', 'sermons_count'];
        if (! in_array($sort, $allowed, true)) $sort = 'started_at';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';

        // Les NULL `started_at` doivent terminer en queue, pas en tête.
        if ($sort === 'started_at') {
            $query->orderByRaw('started_at IS NULL')->orderBy('started_at', $direction);
        } else {
            $query->orderBy($sort, $direction);
        }

        return SermonSeriesResource::collection($query->paginate($perPage));
    }

    public function show(Request $request, int $id): SermonSeriesResource
    {
        if (! $request->user()->can('manage sermon series')) abort(403);

        $series = SermonSeries::withCount('sermons')->findOrFail($id);
        return new SermonSeriesResource($series);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->can('manage sermon series')) abort(403);

        $data = $this->validateData($request);

        $series = SermonSeries::create($data);

        if ($request->hasFile('cover_image')) {
            $this->processAndStoreImage(
                model: $series,
                file: $request->file('cover_image'),
                attribute: 'cover_image',
                targetDir: 'sermons/series',
                options: ['max_width' => 1600, 'max_height' => 900, 'fit' => 'cover'],
            );
        }

        return response()->json([
            'message' => 'Série créée.',
            'data'    => new SermonSeriesResource($series->fresh()),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage sermon series')) abort(403);

        $series = SermonSeries::findOrFail($id);
        $data   = $this->validateData($request, $series->id);

        $series->fill($data)->save();

        if ($request->hasFile('cover_image')) {
            $this->processAndStoreImage(
                model: $series,
                file: $request->file('cover_image'),
                attribute: 'cover_image',
                targetDir: 'sermons/series',
                options: ['max_width' => 1600, 'max_height' => 900, 'fit' => 'cover'],
            );
        }

        return response()->json([
            'message' => 'Série mise à jour.',
            'data'    => new SermonSeriesResource($series->fresh()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage sermon series')) abort(403);

        $series = SermonSeries::withCount('sermons')->findOrFail($id);

        // On NE supprime pas une série qui contient des sermons —
        // sinon on perd le contexte historique. L'admin doit déplacer/dégrouper
        // les sermons d'abord. (Côté schéma : la FK est nullOnDelete, donc même
        // si on force la suppression, les sermons survivent — mais on bloque
        // ici pour pousser l'admin à faire un choix explicite.)
        if ($series->sermons_count > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : {$series->sermons_count} sermons sont encore liés à cette série. Déplace-les d'abord vers une autre série, ou retire-les de la série.",
            ], 422);
        }

        $series->delete();
        return response()->json(['message' => 'Série supprimée.']);
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'title'       => ['required', 'string', 'max:200'],
            'slug'        => [
                'nullable', 'string', 'max:200',
                Rule::unique('sermon_series', 'slug')->ignore($ignoreId),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'started_at'  => ['nullable', 'date'],
            'ended_at'    => ['nullable', 'date', 'after_or_equal:started_at'],
            'is_active'   => ['nullable', 'boolean'],
            'cover_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);
    }
}
