<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // L'autorisation fine (gouverneur = son dept seulement) est gérée par
        // DepartmentPolicy::update appelée dans le controller.
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $deptId = $this->route('id');

        return [
            'name'          => ['sometimes', 'required', 'string', 'max:120',
                                Rule::unique('departments', 'name')->ignore($deptId)],
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
            // Bannière département (image paysage, max 8 Mo).
            'banner_image'  => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ];
    }

    protected function passedValidation(): void
    {
        foreach (['description', 'description_en', 'vision'] as $key) {
            if ($this->has($key) && is_string($this->{$key})) {
                $this->merge([$key => strip_tags($this->{$key})]);
            }
        }
    }
}
