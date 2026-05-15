<?php

namespace App\Http\Requests\Governor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Mise à jour d'un rapport de département.
 * Uniquement autorisé si status=draft (vérifié par DepartmentReportPolicy::update).
 */
class UpdateGovernorReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('submit department report') ?? false;
    }

    public function rules(): array
    {
        return [
            'report_type'   => ['sometimes', 'string', 'max:60'],
            'period_start'  => ['sometimes', 'date'],
            'period_end'    => ['sometimes', 'date', 'after_or_equal:period_start'],
            'form_data'     => ['nullable', 'array'],
        ];
    }
}
