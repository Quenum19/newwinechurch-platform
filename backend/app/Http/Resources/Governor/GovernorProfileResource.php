<?php

namespace App\Http\Resources\Governor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource pour le profil enrichi d'un gouverneur (lecture).
 */
class GovernorProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'user_id'           => $this->user_id,
            'bio'               => $this->bio,
            'phone_direct'      => $this->phone_direct,
            'years_in_role'     => $this->years_in_role,
            'vision_statement'  => $this->vision_statement,
            'photo_profile_url' => $this->photo_profile_url,
            'banner_image_url'  => $this->banner_image_url,
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
