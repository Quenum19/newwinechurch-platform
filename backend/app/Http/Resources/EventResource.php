<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'title'                 => $this->title,
            'slug'                  => $this->slug,
            'description'           => $this->description,
            'type'                  => $this->type,
            'location'              => $this->location,
            'address'               => $this->address,
            'starts_at'             => $this->starts_at?->toIso8601String(),
            'ends_at'               => $this->ends_at?->toIso8601String(),
            'cover_image'           => $this->cover_image,
            'max_attendees'         => $this->max_attendees,
            'registration_required' => $this->registration_required,
            'registration_deadline' => $this->registration_deadline?->toIso8601String(),
            'registration_open'     => $this->isRegistrationOpen(),
            'is_online'             => $this->is_online,
            'online_link'           => $this->is_online ? $this->online_link : null,
            'is_featured'           => $this->is_featured,
            'attendees_count'       => $this->whenCounted('registrations'),
        ];
    }
}
