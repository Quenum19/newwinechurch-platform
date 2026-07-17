<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\SermonThemeResource;
use App\Models\SermonTheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Admin → Thèmes de sermons (catalogue de tags transversaux).
 *
 * Règles métier :
 *   - Les thèmes seedés (`is_default = true`) peuvent être renommés mais PAS
 *     supprimés ni voir leur slug changé. Cela protège l'archivage à 20 ans :
 *     "prière" doit toujours pouvoir être référencé, peu importe ce que l'admin
 *     a touché.
 *   - L'admin peut créer librement de nouveaux thèmes pour ses besoins.
 */
class SermonThemesController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        if (! $request->user()->can('manage sermon themes')) abort(403);

        $query = SermonTheme::query()->withCount('sermons')->ordered();

        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Liste complète : on évite la pagination pour que le picker
        // multi-select côté SermonForm puisse tout afficher (catalogue < 200).
        return SermonThemeResource::collection($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->can('manage sermon themes')) abort(403);

        $data = $request->validate([
            'name'        => ['required', 'string', 'max:100', Rule::unique('sermon_themes', 'name')],
            'description' => ['nullable', 'string', 'max:250'],
            'color'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order'  => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        // is_default = false (créé par l'admin → supprimable).
        $data['is_default'] = false;
        $data['sort_order'] = $data['sort_order'] ?? 500;

        $theme = SermonTheme::create($data);

        return response()->json([
            'message' => 'Thème créé.',
            'data'    => new SermonThemeResource($theme),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage sermon themes')) abort(403);

        $theme = SermonTheme::findOrFail($id);

        $data = $request->validate([
            'name'        => [
                'sometimes', 'required', 'string', 'max:100',
                Rule::unique('sermon_themes', 'name')->ignore($theme->id),
            ],
            'description' => ['nullable', 'string', 'max:250'],
            'color'       => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order'  => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $theme->fill($data)->save();

        return response()->json([
            'message' => 'Thème mis à jour.',
            'data'    => new SermonThemeResource($theme->fresh()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage sermon themes')) abort(403);

        $theme = SermonTheme::withCount('sermons')->findOrFail($id);

        // Protection des thèmes seedés (archivage long terme).
        if ($theme->is_default) {
            return response()->json([
                'message' => 'Ce thème est protégé (catalogue officiel). Tu peux le renommer mais pas le supprimer.',
            ], 422);
        }

        // Si des sermons l'utilisent, on demande confirmation explicite.
        if ($theme->sermons_count > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : {$theme->sermons_count} sermons utilisent ce thème. Retire-le de ces sermons d'abord.",
            ], 422);
        }

        $theme->delete();
        return response()->json(['message' => 'Thème supprimé.']);
    }
}
