<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Création d'un membre par un admin.
 *
 * NB : password optionnel — si vide, on génère un mot de passe aléatoire et on
 * envoie un email d'invitation à initialiser. (Plus pratique pour l'admin que
 * de devoir inventer un mot de passe.)
 */
class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create members') ?? false;
    }

    public function rules(): array
    {
        return [
            'first_name'  => ['required', 'string', 'max:80'],
            'name'        => ['required', 'string', 'max:80'],
            'email'       => [
                'required', 'email', 'max:180',
                Rule::unique('users', 'email')->whereNull('deleted_at'),
            ],
            'phone'       => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'gender'      => ['nullable', 'in:M,F'],
            'birth_date'  => ['nullable', 'date', 'before:today'],
            'city'        => ['nullable', 'string', 'max:100'],
            'address'     => ['nullable', 'string', 'max:200'],
            'is_baptized' => ['nullable', 'boolean'],
            'joined_at'   => ['nullable', 'date'],
            'status'      => ['nullable', 'in:active,inactive,pending'],
            'password'    => ['nullable', 'confirmed', Password::defaults()],
            'roles'       => ['nullable', 'array'],
            'roles.*'     => ['string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'departments' => ['nullable', 'array'],
            'departments.*' => ['integer', Rule::exists('departments', 'id')],
        ];
    }
}
