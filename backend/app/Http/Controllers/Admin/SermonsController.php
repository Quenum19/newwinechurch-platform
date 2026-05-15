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
            ->with(['speaker:id,name,first_name,avatar', 'series:id,title,slug']);

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
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('scripture_reference', 'like', "%{$search}%");
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
            ->with(['speaker', 'series'])
            ->findOrFail($id);

        return new SermonResource($sermon);
    }

    public function store(StoreSermonRequest $request): JsonResponse
    {
        $data = $request->safe()->except(['thumbnail', 'audio_file', 'video_file']);

        // Auto-publication : si is_published=true, on stamp published_at.
        if (($data['is_published'] ?? false) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $sermon = Sermon::create($data);

        $this->handleSermonUploads($request, $sermon);

        return response()->json([
            'message' => 'Sermon créé.',
            'data'    => new SermonResource($sermon->fresh(['speaker', 'series'])),
        ], 201);
    }

    public function update(UpdateSermonRequest $request, int $id): JsonResponse
    {
        $sermon = Sermon::findOrFail($id);
        $data   = $request->safe()->except(['thumbnail', 'audio_file', 'video_file']);

        // Bascule de publication : stamp/dé-stamp published_at.
        if (array_key_exists('is_published', $data)) {
            if ($data['is_published'] && ! $sermon->published_at) {
                $data['published_at'] = now();
            }
        }

        $sermon->fill($data)->save();

        $this->handleSermonUploads($request, $sermon);

        return response()->json([
            'data' => new SermonResource($sermon->fresh(['speaker', 'series'])),
        ]);
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

    /** Bascule rapide de publication (toggle). */
    public function togglePublish(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('publish sermons')) abort(403);

        $sermon = Sermon::findOrFail($id);
        $sermon->update([
            'is_published' => ! $sermon->is_published,
            'published_at' => $sermon->is_published ? $sermon->published_at : now(),
        ]);

        return response()->json([
            'message' => $sermon->is_published ? 'Sermon publié.' : 'Sermon dépublié.',
            'data'    => new SermonResource($sermon->fresh(['speaker', 'series'])),
        ]);
    }
}
