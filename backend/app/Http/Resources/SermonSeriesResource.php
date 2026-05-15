<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SermonSeriesResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'title'        => $this->title,
            'slug'         => $this->slug,
            'description'  => $this->description,
            'cover_image'  => $this->cover_image,
            'started_at'   => $this->started_at?->toDateString(),
            'ended_at'     => $this->ended_at?->toDateString(),
            'is_active'    => $this->is_active,
            'sermons_count'=> $this->whenCounted('sermons'),
        ];
    }
}
