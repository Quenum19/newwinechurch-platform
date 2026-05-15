<?php

namespace App\Http\Requests\Governor;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Déplacement d'un membre vers une autre cellule (par le gouverneur).
 * Le contrôleur vérifie que :
 *  - Le membre appartient au département du gouverneur
 *  - La cellule cible existe et est dans le périmètre du gouverneur
 */
class MoveMemberCellRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage cells') ?? false;
    }

    public function rules(): array
    {
        return [
            'cell_id' => ['nullable', 'integer', 'exists:cells,id'],
        ];
    }
}
