<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Sur les listings, on omet le content (lourd) et on garde l'excerpt.
        $isDetail = (bool) ($this->resource->wasRecentlyDetailed ?? false)
                  || $request->routeIs('*.show');

        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'slug'         => $this->slug,
            'excerpt'      => $this->excerpt,
            'content'      => $isDetail ? $this->content : null,
            'cover_image'  => $this->cover_image,
            'is_featured'  => $this->is_featured,
            'published_at' => $this->published_at?->toIso8601String(),
            'views_count'  => $this->views_count,

            'author' => $this->whenLoaded('author', fn () => [
                'id'     => $this->author?->id,
                'name'   => $this->author?->full_name,
                'avatar' => $this->author?->avatar,
            ]),

            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id'    => $this->category->id,
                'name'  => $this->category->name,
                'slug'  => $this->category->slug,
                'color' => $this->category->color,
            ] : null),
        ];
    }
}
