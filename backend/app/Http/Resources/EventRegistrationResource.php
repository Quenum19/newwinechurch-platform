<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventRegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'status'        => $this->status,
            'notes'         => $this->notes,
            'registered_at' => $this->registered_at?->toIso8601String(),
            'event'         => $this->whenLoaded('event', fn () => new EventResource($this->event)),
        ];
    }
}
