<?php

namespace App\Http\Requests\Governor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mise à jour d'une cellule par un gouverneur (de son périmètre).
 * Le scope est vérifié par CellPolicy::update + scope leader.department_id
 * dans le controller.
 */
class UpdateGovernorCellRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage cells') ?? false;
    }

    public function rules(): array
    {
        $cellId = $this->route('id');

        return [
            'name'             => ['sometimes', 'string', 'max:120',
                                   Rule::unique('cells', 'name')->ignore($cellId)],
            'description'      => ['nullable', 'string', 'max:1000'],
            'zone'             => ['nullable', 'string', 'max:100'],
            'meeting_day'      => ['nullable', 'in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche'],
            'meeting_time'     => ['nullable', 'date_format:H:i'],
            'meeting_location' => ['nullable', 'string', 'max:255'],
            'target_size'      => ['nullable', 'integer', 'min:1', 'max:100'],
            'whatsapp_link'    => ['nullable', 'url', 'max:500'],
            'is_active'        => ['nullable', 'boolean'],
        ];
    }
}
