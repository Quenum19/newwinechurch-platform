<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsStorageUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TestimonialResource extends JsonResource
{
    use FormatsStorageUrls;

    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'age'          => $this->age,
            'role'         => $this->role,
            'location'     => $this->location,
            'quote'        => $this->quote,
            // URLs ABSOLUES — cohérent avec sermons/events/media.
            'image_path'   => $this->fullStorageUrl($this->image_path),
            'video_path'   => $this->fullStorageUrl($this->video_path),
            'video_url'    => $this->video_url,
            'thumbnail'    => $this->fullStorageUrl($this->thumbnail),
            'is_published' => (bool) $this->is_published,
            'is_featured'  => (bool) $this->is_featured,
            'sort_order'   => (int) $this->sort_order,
            // Type calculé pour faciliter le rendu côté frontend.
            'has_video'    => (bool) ($this->video_path || $this->video_url),
            'has_image'    => (bool) $this->image_path,
        ];
    }
}
