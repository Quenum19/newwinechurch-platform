<?php

namespace App\Http\Resources\Leader;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource pour une présence cellule.
 */
class CellAttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'cell_id'      => $this->cell_id,
            'member_id'    => $this->member_id,
            'meeting_date' => $this->meeting_date?->toDateString(),
            'is_present'   => (bool) $this->is_present,
            'arrived_late' => (bool) $this->arrived_late,
            'note'         => $this->note,

            'member' => $this->whenLoaded('member', fn () => $this->member ? [
                'id'        => $this->member->id,
                'full_name' => $this->member->full_name,
                'avatar'    => $this->member->avatar_url,
            ] : null),
        ];
    }
}
