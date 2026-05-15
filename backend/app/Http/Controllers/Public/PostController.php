<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Models\PostCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Contrôleur public — articles de blog.
 */
class PostController extends Controller
{
    /** Liste paginée des articles publiés. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 9), 30);

        $query = Post::published()
            ->with(['author:id,name,first_name,avatar', 'category:id,name,slug,color'])
            ->orderByDesc('published_at');

        if ($categorySlug = $request->query('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $categorySlug));
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        return PostResource::collection($query->paginate($perPage));
    }

    /** Détail d'un article. */
    public function show(string $slug)
    {
        $post = Post::published()
            ->where('slug', $slug)
            ->with(['author:id,name,first_name,avatar,bio', 'category:id,name,slug,color'])
            ->firstOrFail();

        $post->recordView();

        // Hint pour PostResource → renvoyer le content complet.
        $post->wasRecentlyDetailed = true;

        return new PostResource($post);
    }

    /** Liste des catégories d'articles. */
    public function categories()
    {
        return PostCategory::query()
            ->withCount(['posts' => fn ($q) => $q->published()])
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'color']);
    }
}
