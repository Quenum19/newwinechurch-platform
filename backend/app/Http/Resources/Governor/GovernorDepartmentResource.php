<?php

namespace App\Http\Resources\Governor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource pour le département complet d'un gouverneur.
 *
 * Inclut profil gouverneur enrichi + stats cellules + membres si chargés.
 */
class GovernorDepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'name'               => $this->name,
            'slug'               => $this->slug,
            'description'        => $this->description,
            'vision'             => $this->vision,
            'icon'               => $this->icon,
            'color'              => $this->color,
            'color_theme'        => $this->color_theme,
            'banner_image_url'   => $this->banner_image_url,
            'profile_photo_url'  => $this->profile_photo_url,
            'status'             => $this->status,
            'is_active'          => (bool) $this->is_active,
            'founded_at'         => $this->founded_at?->toDateString(),
            'sort_order'         => $this->sort_order,
            'member_count_cache' => $this->member_count_cache,
            'members_count'      => $this->whenCounted('members'),
            'reports_count'      => $this->whenCounted('reports'),

            // Gouverneur principal courant + son profil enrichi.
            'governor' => $this->whenLoaded('governor', fn () => $this->governor ? [
                'id'        => $this->governor->id,
                'full_name' => $this->governor->full_name,
                'avatar'    => $this->governor->avatar_url,
                'phone'     => $this->governor->phone,
                'profile'   => $this->governor->relationLoaded('governorProfile') && $this->governor->governorProfile
                    ? new GovernorProfileResource($this->governor->governorProfile)
                    : null,
            ] : null),
        ];
    }
}
