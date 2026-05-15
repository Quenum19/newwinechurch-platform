<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email', 'max:180'],
            'password' => ['required', 'string', 'min:6', 'max:200'],
            'remember' => ['nullable', 'boolean'],
            // Optionnel : nom du device pour mode token mobile (cf AuthController).
            'device_name' => ['nullable', 'string', 'max:80'],
        ];
    }
}
