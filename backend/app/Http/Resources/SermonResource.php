<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * SermonResource — formatte un sermon pour l'API.
 *
 * Utilisé en liste (champs essentiels) et en détail (champs étendus).
 */
class SermonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'title'               => $this->title,
            'slug'                => $this->slug,
            'description'         => $this->description,
            'scripture_reference' => $this->scripture_reference,
            'sermon_date'         => $this->sermon_date?->toDateString(),
            'type'                => $this->type,
            'video_url'           => $this->video_url,
            'audio_url'           => $this->audio_url,
            'youtube_url'         => $this->youtube_url,
            'thumbnail'           => $this->thumbnail,
            'duration_seconds'    => $this->duration_seconds,
            'duration_human'      => $this->duration_seconds
                ? sprintf('%d min', round($this->duration_seconds / 60))
                : null,
            'views_count'         => $this->views_count,
            'is_featured'         => $this->is_featured,
            'published_at'        => $this->published_at?->toIso8601String(),

            'speaker' => $this->whenLoaded('speaker', fn () => [
                'id'         => $this->speaker?->id,
                'name'       => $this->speaker?->full_name,
                'avatar'     => $this->speaker?->avatar,
            ]),

            'series' => $this->whenLoaded('series', fn () => $this->series ? [
                'id'    => $this->series->id,
                'title' => $this->series->title,
                'slug'  => $this->series->slug,
            ] : null),
        ];
    }
}
