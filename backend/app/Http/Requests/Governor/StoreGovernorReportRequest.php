<?php

namespace App\Http\Requests\Governor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Création d'un rapport de département par le gouverneur.
 * Status créé toujours en 'draft' (le contrôleur force).
 */
class StoreGovernorReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('submit department report') ?? false;
    }

    public function rules(): array
    {
        return [
            'report_type'   => ['required', 'string', 'max:60'],
            'period_start'  => ['required', 'date'],
            'period_end'    => ['required', 'date', 'after_or_equal:period_start'],
            // form_data structuré, libre côté template (max profondeur raisonnable).
            'form_data'     => ['nullable', 'array'],
        ];
    }
}
