<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Revue/approbation/rejet d'un rapport de département (admin/pasteur).
 * review_comment est requis si rejected.
 */
class ReviewDepartmentReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('review department report') ?? false;
    }

    public function rules(): array
    {
        return [
            'status'         => ['required', 'in:approved,rejected,reviewed'],
            'review_comment' => ['required_if:status,rejected', 'nullable', 'string', 'max:2000'],
        ];
    }

    protected function passedValidation(): void
    {
        if ($this->has('review_comment') && is_string($this->review_comment)) {
            $this->merge(['review_comment' => strip_tags($this->review_comment)]);
        }
    }
}
