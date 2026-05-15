<?php

namespace App\Http\Resources\Governor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource pour un rapport de département.
 * Inclut reviewer info quand chargé.
 */
class DepartmentReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'department_id'  => $this->department_id,
            'governor_id'    => $this->governor_id,
            'report_type'    => $this->report_type,
            'period_start'   => $this->period_start?->toDateString(),
            'period_end'     => $this->period_end?->toDateString(),
            'form_data'      => $this->form_data,
            'status'         => $this->status,
            'is_late'        => $this->isLate(),
            'submitted_at'   => $this->submitted_at?->toIso8601String(),
            'reviewed_at'    => $this->reviewed_at?->toIso8601String(),
            'review_comment' => $this->review_comment,
            'has_pdf'        => ! empty($this->pdf_path),
            'pdf_generated_at' => $this->pdf_generated_at?->toIso8601String(),
            'created_at'     => $this->created_at?->toIso8601String(),
            'updated_at'     => $this->updated_at?->toIso8601String(),

            'department' => $this->whenLoaded('department', fn () => [
                'id'   => $this->department->id,
                'name' => $this->department->name,
                'slug' => $this->department->slug,
            ]),
            'governor' => $this->whenLoaded('governor', fn () => $this->governor ? [
                'id'        => $this->governor->id,
                'full_name' => $this->governor->full_name,
                'avatar'    => $this->governor->avatar_url,
            ] : null),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id'        => $this->reviewer->id,
                'full_name' => $this->reviewer->full_name,
            ] : null),
        ];
    }
}
