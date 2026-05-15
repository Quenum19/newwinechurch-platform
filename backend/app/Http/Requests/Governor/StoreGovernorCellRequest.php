<?php

namespace App\Http\Requests\Governor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Création d'une cellule par un gouverneur.
 * Le leader doit être un membre du département du gouverneur.
 */
class StoreGovernorCellRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage cells') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:120', Rule::unique('cells', 'name')],
            'description'      => ['nullable', 'string', 'max:1000'],
            'leader_id'        => ['required', 'integer', 'exists:users,id'],
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
