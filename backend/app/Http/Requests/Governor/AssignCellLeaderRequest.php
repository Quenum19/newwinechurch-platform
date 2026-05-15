<?php

namespace App\Http\Requests\Governor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Assignation d'un leader à une cellule par un gouverneur.
 * Le user_id cible doit être un membre du département du gouverneur
 * (vérification métier dans le controller).
 */
class AssignCellLeaderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage cells') ?? false;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'notes'   => ['nullable', 'string', 'max:500'],
        ];
    }
}
