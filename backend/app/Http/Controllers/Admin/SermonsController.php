<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSermonRequest;
use App\Http\Requests\Admin\UpdateSermonRequest;
use App\Http\Resources\SermonResource;
use App\Models\Sermon;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

/**
 * Admin → Sermons (CRUD + publication + upload thumbnail).
 *
 * Workflow :
 *   - Création/édition : champs + thumbnail optionnel (queue)
 *   - Publication : flag is_published + published_at
 *   - Soft delete (jamais SQL DELETE)
 *
 * Pour millions de membres : index sur is_published + sermon_date,
 * pagination obligatoire, eager loading speaker + series.
 */
class SermonsController extends Controller
{
    use HandlesImageUpload;

    public function index(Request $request): AnonymousResourceCollection
    {
        if (! $request->user()->can('view sermons')) abort(403);

        $perPage = min((int) $request->query('per_page', 20), 100);

        $query = Sermon::query()
            ->with(['speaker:id,name,first_name,avatar', 'series:id,title,slug', 'themes:id,slug,name,color']);

        // Filtres
        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }
        if ($status = $request->query('status')) {
            $query->where('is_published', $status === 'published');
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($seriesId = $request->query('series_id')) {
            $query->where('series_id', $seriesId);
        }
        // Filtre par thème (slug OU id). Utile pour la recherche transverse.
        if ($themeFilter = $request->query('theme')) {
            $query->whereHas('themes', function ($q) use ($themeFilter) {
                if (is_numeric($themeFilter)) {
                    $q->where('sermon_themes.id', (int) $themeFilter);
                } else {
                    $q->where('sermon_themes.slug', $themeFilter);
                }
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

        // Tri
        $sort = (string) $request->query('sort', 'sermon_date');
        $allowed = ['sermon_date', 'title', 'views_count', 'created_at'];
        if (! in_array($sort, $allowed, true)) $sort = 'sermon_date';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        return SermonResource::collection($query->paginate($perPage));
    }

    public function show(int $id): SermonResource
    {
        $sermon = Sermon::withTrashed()
            ->with(['speaker', 'series', 'themes'])
            ->findOrFail($id);

        return new SermonResource($sermon);
    }

    public function store(StoreSermonRequest $request): JsonResponse
    {
        $data    = $request->safe()->except(['thumbnail', 'audio_file', 'video_file', 'themes']);
        $themeIds = $this->normalizeThemeIds($request->input('themes'));

        // Auto-publication : si is_published=true, on stamp published_at.
        if (($data['is_published'] ?? false) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $sermon = Sermon::create($data);
        $sermon->themes()->sync($themeIds);

        $this->handleSermonUploads($request, $sermon);

        return response()->json([
            'message' => 'Sermon créé.',
            'data'    => new SermonResource($sermon->fresh(['speaker', 'series', 'themes'])),
        ], 201);
    }

    public function update(UpdateSermonRequest $request, int $id): JsonResponse
    {
        $sermon = Sermon::findOrFail($id);
        $data   = $request->safe()->except(['thumbnail', 'audio_file', 'video_file', 'themes']);

        // Bascule de publication : stamp/dé-stamp published_at.
        if (array_key_exists('is_published', $data)) {
            if ($data['is_published'] && ! $sermon->published_at) {
                $data['published_at'] = now();
            }
        }

        $sermon->fill($data)->save();

        // Sync des thèmes UNIQUEMENT si le client a explicitement envoyé le
        // champ (sinon on les conserve — utile pour les requêtes partielles).
        if ($request->has('themes')) {
            $sermon->themes()->sync($this->normalizeThemeIds($request->input('themes')));
        }

        $this->handleSermonUploads($request, $sermon);

        return response()->json([
            'data' => new SermonResource($sermon->fresh(['speaker', 'series', 'themes'])),
        ]);
    }

    /**
     * Accepte un tableau d'IDs (int ou string numérique), un CSV "1,2,3" ou
     * un JSON encodé. Retourne uniquement les IDs qui existent réellement
     * dans la table sermon_themes (silencieux : les invalides sont droppés).
     *
     * On accepte plusieurs formats car FormData ne supporte pas nativement
     * les tableaux d'entiers (toujours casté en string côté HTTP).
     */
    private function normalizeThemeIds(mixed $input): array
    {
        if (empty($input)) return [];

        $candidates = match (true) {
            is_array($input)                   => $input,
            is_string($input) && str_starts_with(trim($input), '[') => (array) json_decode($input, true),
            is_string($input)                  => array_filter(array_map('trim', explode(',', $input))),
            default                            => [],
        };

        $ids = array_unique(array_map('intval', $candidates));
        $ids = array_filter($ids, fn ($id) => $id > 0);

        if (empty($ids)) return [];

        return \App\Models\SermonTheme::whereIn('id', $ids)->pluck('id')->all();
    }

    /**
     * Centralise les uploads optionnels d'un sermon :
     *  - thumbnail   → conversion WebP via le trait
     *  - audio_file  → stockage direct, met à jour audio_url avec le path public
     *  - video_file  → idem video_url
     *
     * Les URLs externes (audio_url/video_url/youtube_url) restent prioritaires
     * si elles sont fournies — l'upload local les écrase uniquement quand
     * un nouveau fichier est présent dans la requête.
     */
    private function handleSermonUploads(Request $request, Sermon $sermon): void
    {
        if ($request->hasFile('thumbnail')) {
            $this->processAndStoreImage(
                model: $sermon,
                file: $request->file('thumbnail'),
                attribute: 'thumbnail',
                targetDir: 'sermons/thumbnails',
                options: ['max_width' => 1280, 'max_height' => 720, 'fit' => 'cover'],
            );
        }

        if ($request->hasFile('audio_file')) {
            $path = $this->storeMediaFile($request->file('audio_file'), 'sermons/audio');
            // Si l'admin avait set une audio_url externe, le fichier local prend la main.
            $oldPath = $sermon->audio_url;
            $sermon->update(['audio_url' => "/storage/{$path}"]);
            $this->cleanupOldLocal($oldPath);
        }

        if ($request->hasFile('video_file')) {
            $path = $this->storeMediaFile($request->file('video_file'), 'sermons/video');
            $oldPath = $sermon->video_url;
            $sermon->update(['video_url' => "/storage/{$path}"]);
            $this->cleanupOldLocal($oldPath);
        }
    }

    /** Stocke un fichier audio/vidéo tel quel (pas de transcodage). */
    private function storeMediaFile(\Illuminate\Http\UploadedFile $file, string $targetDir): string
    {
        $disk = Storage::disk(config('filesystems.default'));
        $path = sprintf(
            '%s/%s.%s',
            trim($targetDir, '/'),
            bin2hex(random_bytes(16)),
            strtolower($file->getClientOriginalExtension() ?: 'bin'),
        );
        $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);
        return $path;
    }

    /** Supprime l'ancien fichier local (URL commençant par /storage/) si existant. */
    private function cleanupOldLocal(?string $url): void
    {
        if (! $url || ! str_starts_with($url, '/storage/')) return;
        $relative = ltrim(substr($url, strlen('/storage/')), '/');
        $disk = Storage::disk(config('filesystems.default'));
        if ($disk->exists($relative)) {
            $disk->delete($relative);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete sermons')) abort(403);
        $sermon = Sermon::findOrFail($id);
        $sermon->delete();
        return response()->json(['message' => 'Sermon archivé.']);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete sermons')) abort(403);
        $sermon = Sermon::onlyTrashed()->findOrFail($id);
        $sermon->restore();
        return response()->json(['message' => 'Sermon restauré.']);
    }

    /**
     * Action en lot sur N sermons.
     * Body : { action: 'publish'|'unpublish'|'feature'|'unfeature'|'delete'|'restore', ids: [int] }
     */
    public function bulk(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['required', 'string', 'in:publish,unpublish,feature,unfeature,delete,restore'],
            'ids'    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'  => ['integer'],
        ]);

        $user = $request->user();
        $action = $request->input('action');
        $ids = $request->input('ids');

        $perm = match ($action) {
            'publish', 'unpublish'        => 'publish sermons',
            'feature', 'unfeature'        => 'edit sermons',
            'delete'                      => 'delete sermons',
            'restore'                     => 'delete sermons',
        };
        abort_unless($user?->can($perm), 403);

        switch ($action) {
            case 'publish':
                $count = Sermon::whereIn('id', $ids)->update([
                    'is_published' => true,
                    'published_at' => now(),
                ]);
                return response()->json(['message' => "$count sermon(s) publié(s).", 'count' => $count]);
            case 'unpublish':
                $count = Sermon::whereIn('id', $ids)->update(['is_published' => false]);
                return response()->json(['message' => "$count sermon(s) dépublié(s).", 'count' => $count]);
            case 'feature':
                $count = Sermon::whereIn('id', $ids)->update(['is_featured' => true]);
                return response()->json(['message' => "$count sermon(s) mis en avant.", 'count' => $count]);
            case 'unfeature':
                $count = Sermon::whereIn('id', $ids)->update(['is_featured' => false]);
                return response()->json(['message' => "$count sermon(s) retirés de la mise en avant.", 'count' => $count]);
            case 'delete':
                $count = Sermon::whereIn('id', $ids)->delete();
                return response()->json(['message' => "$count sermon(s) archivé(s).", 'count' => $count]);
            case 'restore':
                $count = Sermon::onlyTrashed()->whereIn('id', $ids)->restore();
                return response()->json(['message' => "$count sermon(s) restauré(s).", 'count' => $count]);
        }
        return response()->json(['message' => 'Action inconnue.'], 400);
    }

    /**
     * Bascule rapide de publication (toggle).
     *
     * NB : on capture `was_published` AVANT update — sinon les valeurs
     * dérivées (message, published_at) sont calculées sur le NEW state et
     * le résultat devient incohérent.
     */
    public function togglePublish(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('publish sermons')) abort(403);

        $sermon = Sermon::findOrFail($id);
        $wasPublished = (bool) $sermon->is_published;

        $sermon->update([
            'is_published' => ! $wasPublished,
            // PUBLISH → stamp now() (sauf si déjà un timestamp historique)
            // DÉPUBLIE → vide le timestamp (cohérent avec le flag).
            'published_at' => $wasPublished ? null : ($sermon->published_at ?? now()),
        ]);

        return response()->json([
            'message' => $wasPublished ? 'Sermon dépublié.' : 'Sermon publié.',
            'data'    => new SermonResource($sermon->fresh(['speaker', 'series'])),
        ]);
    }
}
