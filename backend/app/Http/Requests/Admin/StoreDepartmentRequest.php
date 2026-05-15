<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage departments') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:120',
                                Rule::unique('departments', 'name')],
            'name_en'       => ['nullable', 'string', 'max:120'],
            'description'   => ['nullable', 'string', 'max:2000'],
            'description_en'=> ['nullable', 'string', 'max:2000'],
            'vision'        => ['nullable', 'string', 'max:2000'],
            'icon'          => ['nullable', 'string', 'max:50'],
            'color'         => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'color_theme'   => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'governor_id'   => ['nullable', 'integer', Rule::exists('users', 'id')],
            'status'        => ['nullable', 'in:active,pending'],
            'is_active'     => ['nullable', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'sort_order'    => ['nullable', 'integer', 'min:0'],
            'founded_at'    => ['nullable', 'date'],
        ];
    }
}
