<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            // `name` renvoie automatiquement EN si Accept-Language=en et name_en
            // est rempli, sinon FR (display_name accessor). Frontend public.
            'name'               => $this->display_name,
            // Versions brutes FR / EN — utilisées par le form admin pour édition.
            'name_fr'            => $this->name,
            'name_en'            => $this->name_en,
            'slug'               => $this->slug,
            'description'        => $this->display_description,
            'description_fr'     => $this->description,
            'description_en'     => $this->description_en,
            'vision'             => $this->vision,
            'icon'               => $this->icon,
            'color'              => $this->color,
            'color_theme'        => $this->color_theme,
            'banner_image_url'   => $this->banner_image_url,
            'profile_photo_url'  => $this->profile_photo_url,
            'status'             => $this->status,
            'is_active'          => (bool) $this->is_active,
            'display_order'      => $this->display_order,
            'sort_order'         => $this->sort_order,
            'founded_at'         => $this->founded_at?->toDateString(),
            'member_count_cache' => $this->member_count_cache,
            'members_count'      => $this->whenCounted('members'),

            // Alias 'captain' conservé pour compat ascendante du frontend
            // (sera retiré à l'Étape 4 quand le frontend basculera sur 'governor').
            'governor' => $this->whenLoaded('governor', fn () => $this->governor ? [
                'id'     => $this->governor->id,
                'name'   => $this->governor->full_name,
                'avatar' => $this->governor->avatar,
            ] : null),
            'captain' => $this->whenLoaded('governor', fn () => $this->governor ? [
                'id'     => $this->governor->id,
                'name'   => $this->governor->full_name,
                'avatar' => $this->governor->avatar,
            ] : null),
        ];
    }
}
