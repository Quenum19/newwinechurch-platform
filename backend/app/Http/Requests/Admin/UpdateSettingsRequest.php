<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Mise à jour batch des paramètres du site.
 * Le format attendu : { "settings": { "key1": "value1", "key2": "value2" } }
 */
class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage settings') ?? false;
    }

    public function rules(): array
    {
        return [
            'settings'   => ['required', 'array', 'min:1'],
            'settings.*' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function passedValidation(): void
    {
        // Sanitisation : on strip tags sur toutes les valeurs textuelles.
        $clean = [];
        foreach ((array) $this->input('settings', []) as $k => $v) {
            $clean[$k] = is_string($v) ? strip_tags($v) : $v;
        }
        $this->merge(['settings' => $clean]);
    }
}
