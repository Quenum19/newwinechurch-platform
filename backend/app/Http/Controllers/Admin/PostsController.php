<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Admin → Articles de blog (Tiptap rich text).
 *
 * Le contenu Tiptap est sanitisé serveur-side (HtmlSanitizer) pour
 * empêcher les injections XSS via tags non autorisés ou attributs onclick=.
 */
class PostsController extends Controller
{
    use HandlesImageUpload;

    public function index(Request $request): AnonymousResourceCollection
    {
        if (! $request->user()->can('view posts')) abort(403);

        $perPage = min((int) $request->query('per_page', 20), 100);

        $query = Post::query()->with(['author:id,name,first_name,avatar', 'category:id,name,slug,color']);

        if ($request->boolean('trashed')) $query->onlyTrashed();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        $sort = (string) $request->query('sort', 'created_at');
        $allowed = ['created_at', 'published_at', 'title', 'views_count'];
        if (! in_array($sort, $allowed, true)) $sort = 'created_at';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        return PostResource::collection($query->paginate($perPage));
    }

    public function show(int $id): PostResource
    {
        $post = Post::withTrashed()->with(['author', 'category'])->findOrFail($id);
        $post->wasRecentlyDetailed = true; // hint pour PostResource → expose le content
        return new PostResource($post);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->safe()->except(['cover_image']);
        $data['author_id'] = $request->user()->id;

        if (($data['status'] ?? 'draft') === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $post = Post::create($data);

        if ($request->hasFile('cover_image')) {
            $this->dispatchImageProcessing(
                model: $post,
                file: $request->file('cover_image'),
                attribute: 'cover_image',
                targetDir: 'posts/covers',
                options: ['max_width' => 1600, 'max_height' => 900],
            );
        }

        $post->wasRecentlyDetailed = true;
        return response()->json([
            'message' => 'Article créé.',
            'data'    => new PostResource($post->load(['author', 'category'])),
        ], 201);
    }

    public function update(UpdatePostRequest $request, int $id): JsonResponse
    {
        $post = Post::findOrFail($id);
        $data = $request->safe()->except(['cover_image']);

        if (array_key_exists('status', $data) && $data['status'] === 'published' && ! $post->published_at) {
            $data['published_at'] = now();
        }

        $post->fill($data)->save();

        if ($request->hasFile('cover_image')) {
            $this->dispatchImageProcessing(
                model: $post,
                file: $request->file('cover_image'),
                attribute: 'cover_image',
                targetDir: 'posts/covers',
                options: ['max_width' => 1600, 'max_height' => 900],
            );
        }

        $post = $post->fresh(['author', 'category']);
        $post->wasRecentlyDetailed = true;
        return response()->json(['data' => new PostResource($post)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete posts')) abort(403);
        Post::findOrFail($id)->delete();
        return response()->json(['message' => 'Article archivé.']);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('delete posts')) abort(403);
        Post::onlyTrashed()->findOrFail($id)->restore();
        return response()->json(['message' => 'Article restauré.']);
    }

    public function bulk(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['required', 'in:publish,unpublish,delete'],
            'ids'    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'  => ['integer'],
        ]);
        $user = $request->user();
        $perm = $request->action === 'delete' ? 'delete posts' : 'publish posts';
        abort_unless($user?->can($perm), 403);

        $ids = $request->input('ids');
        $a = $request->input('action');

        $count = match ($a) {
            'publish'   => Post::whereIn('id', $ids)->update(['status' => 'published', 'published_at' => now()]),
            'unpublish' => Post::whereIn('id', $ids)->update(['status' => 'draft']),
            'delete'    => Post::whereIn('id', $ids)->delete(),
        };
        $labels = ['publish' => 'publié(s)', 'unpublish' => 'remis en brouillon', 'delete' => 'archivé(s)'];
        return response()->json(['message' => "$count article(s) " . $labels[$a] . '.', 'count' => $count]);
    }

    public function togglePublish(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('publish posts')) abort(403);

        $post = Post::findOrFail($id);
        $post->update([
            'status'       => $post->status === 'published' ? 'draft' : 'published',
            'published_at' => $post->status === 'published' ? $post->published_at : now(),
        ]);

        return response()->json([
            'message' => $post->status === 'published' ? 'Article publié.' : 'Article remis en brouillon.',
        ]);
    }

    /**
     * Upload d'image inline dans l'éditeur Tiptap (depuis la barre d'outils).
     * Renvoie l'URL publique pour insertion dans le contenu HTML.
     */
    public function uploadInlineImage(Request $request): JsonResponse
    {
        if (! $request->user()->can('create posts')) abort(403);

        $request->validate([
            'image' => ['required', 'file',
                        'mimes:jpg,jpeg,png,webp,gif',
                        'mimetypes:image/jpeg,image/png,image/webp,image/gif',
                        'max:5120',
                        'dimensions:max_width=4000,max_height=4000'],
        ]);

        $file = $request->file('image');
        $disk = \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'));

        // Pour les images inline, on les optimise immédiatement (pas en queue) car
        // l'utilisateur attend l'URL pour l'insérer dans Tiptap.
        $image = \Intervention\Image\Laravel\Facades\Image::read($file->getRealPath());
        $image->scaleDown(1600, 1600);
        $webp = (string) $image->toWebp(85);

        $path = sprintf('posts/inline/%s.webp', bin2hex(random_bytes(16)));
        $disk->put($path, $webp, ['visibility' => 'public']);

        return response()->json([
            'url' => '/storage/'.$path,
        ]);
    }
}
