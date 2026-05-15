<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrayerRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'display_name'    => $this->display_name,
            'request'         => $this->request,
            'category'        => $this->category,
            'is_answered'     => $this->is_answered,
            'prayed_by_count' => $this->prayed_by_count,
            'created_at'      => $this->created_at?->toIso8601String(),
        ];
    }
}
