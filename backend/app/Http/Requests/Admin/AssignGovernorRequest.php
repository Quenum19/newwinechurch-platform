<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Assignation d'un gouverneur à un département (admin uniquement).
 * Si is_primary=true et qu'un primaire actif existe déjà, il sera basculé en
 * is_primary=false par le controller (transaction atomique).
 */
class AssignGovernorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('assign governors') ?? false;
    }

    public function rules(): array
    {
        return [
            'user_id'    => ['required', 'integer', 'exists:users,id'],
            'is_primary' => ['nullable', 'boolean'],
            'notes'      => ['nullable', 'string', 'max:500'],
        ];
    }
}
