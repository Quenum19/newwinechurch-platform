<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Sortie API d'un grant event_staff — affiché dans le panneau Staff.
 */
class EventStaffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'event_id'       => $this->event_id,
            'user_id'        => $this->user_id,
            'grant'          => $this->grant,
            'assigned_at'    => $this->assigned_at?->toIso8601String(),
            'revoked_at'     => $this->revoked_at?->toIso8601String(),
            'revoke_reason'  => $this->revoke_reason,
            'is_active'      => $this->isActive(),
            'user'           => $this->whenLoaded('user', fn () => [
                'id'         => $this->user->id,
                'name'       => trim(($this->user->first_name ?? '').' '.($this->user->name ?? '')),
                'email'      => $this->user->email,
                'phone'      => $this->user->phone,
                'avatar'     => $this->user->avatar_url,
            ]),
            'assigner'       => $this->whenLoaded('assigner', fn () => $this->assigner ? [
                'id'   => $this->assigner->id,
                'name' => trim(($this->assigner->first_name ?? '').' '.($this->assigner->name ?? '')),
            ] : null),
        ];
    }
}
