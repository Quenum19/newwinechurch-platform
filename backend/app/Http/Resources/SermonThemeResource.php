<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SermonThemeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'slug'          => $this->slug,
            'name'          => $this->name,
            'description'   => $this->description,
            'color'         => $this->color,
            'is_default'    => (bool) $this->is_default,
            'sort_order'    => (int) $this->sort_order,
            'sermons_count' => $this->whenCounted('sermons'),
        ];
    }
}
