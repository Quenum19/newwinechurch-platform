<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('edit members') ?? false;
    }

    public function rules(): array
    {
        $userId = $this->route('id');

        return [
            'first_name'  => ['sometimes', 'required', 'string', 'max:80'],
            'name'        => ['sometimes', 'required', 'string', 'max:80'],
            'email'       => [
                'sometimes', 'required', 'email', 'max:180',
                Rule::unique('users', 'email')->ignore($userId)->whereNull('deleted_at'),
            ],
            'phone'       => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'gender'      => ['nullable', 'in:M,F'],
            'birth_date'  => ['nullable', 'date', 'before:today'],
            'city'        => ['nullable', 'string', 'max:100'],
            'address'     => ['nullable', 'string', 'max:200'],
            'bio'         => ['nullable', 'string', 'max:1000'],
            'is_baptized' => ['nullable', 'boolean'],
            'joined_at'   => ['nullable', 'date'],
            'status'      => ['nullable', 'in:active,inactive,pending'],
            // Reset optionnel du password — utile si l'admin doit dépanner un membre.
            'password'    => ['nullable', 'confirmed', Password::defaults()],
        ];
    }

    /** Sanitisation HTML du bio (anti-XSS). */
    protected function passedValidation(): void
    {
        if ($this->has('bio') && is_string($this->bio)) {
            $this->merge(['bio' => strip_tags($this->bio)]);
        }
    }
}
