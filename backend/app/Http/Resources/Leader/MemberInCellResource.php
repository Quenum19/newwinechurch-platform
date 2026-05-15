<?php

namespace App\Http\Resources\Leader;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource d'un membre tel que vu par son leader de cellule.
 * Champs minimaux + stats de présence sur 8 dernières semaines (si chargé
 * via withCount en amont).
 */
class MemberInCellResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'full_name'   => $this->full_name,
            'first_name'  => $this->first_name,
            'name'        => $this->name,
            'phone'       => $this->phone,
            'avatar'      => $this->avatar_url,
            'city'        => $this->city,
            'is_baptized' => (bool) $this->is_baptized,
            'status'      => $this->status,
            'joined_at'   => $this->joined_at?->toDateString(),

            // Stats fournies en amont via withCount('attendances as ...') ou subqueries.
            'attendances_present_count' => $this->whenCounted('attendancesPresent'),
            'attendances_total_count'   => $this->whenCounted('attendancesAll'),

            // Rôle dans la cellule (via pivot, si chargé).
            'cell_role' => $this->whenPivotLoaded('cell_user', fn () => $this->pivot->role ?? null),
            'is_convert' => $this->whenPivotLoaded('cell_user', fn () => (bool) ($this->pivot->is_convert ?? false)),
        ];
    }
}
