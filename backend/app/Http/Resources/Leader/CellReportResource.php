<?php

namespace App\Http\Resources\Leader;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource pour un rapport hebdomadaire de cellule (vue leader).
 */
class CellReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'cell_id'          => $this->cell_id,
            'leader_id'        => $this->leader_id,
            'week_start'       => $this->week_start?->toDateString(),
            'week_end'         => $this->week_end?->toDateString(),
            'attendance_count' => $this->attendance_count,
            'new_members'      => $this->new_members,
            'prayer_requests'  => $this->prayer_requests,
            'activities'       => $this->activities,
            'challenges'       => $this->challenges,
            'highlights'       => $this->highlights,
            'needs_followup'   => (bool) $this->needs_followup,
            'status'           => $this->status,
            'is_late'          => $this->isLate(),
            'submitted_at'     => $this->submitted_at?->toIso8601String(),
            'reviewed_at'      => $this->reviewed_at?->toIso8601String(),
            'review_comment'   => $this->review_comment,
            'has_pdf'          => ! empty($this->pdf_path),
            'pdf_generated_at' => $this->pdf_generated_at?->toIso8601String(),
            'created_at'       => $this->created_at?->toIso8601String(),

            'cell' => $this->whenLoaded('cell', fn () => [
                'id'   => $this->cell->id,
                'name' => $this->cell->name,
                'zone' => $this->cell->zone,
            ]),
            'leader' => $this->whenLoaded('leader', fn () => $this->leader ? [
                'id'        => $this->leader->id,
                'full_name' => $this->leader->full_name,
                'avatar'    => $this->leader->avatar_url,
            ] : null),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id'        => $this->reviewer->id,
                'full_name' => $this->reviewer->full_name,
            ] : null),
        ];
    }
}
