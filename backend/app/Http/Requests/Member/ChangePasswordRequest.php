<?php

namespace App\Http\Requests\Member;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

/**
 * Changement de mot de passe par un utilisateur connecté.
 *
 * On exige le mot de passe actuel pour confirmer l'identité (anti-hijack
 * de session). Le nouveau doit respecter la politique stricte (10+ chars).
 */
class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', 'different:current_password', Password::defaults()],
        ];
    }

    /**
     * Vérification que current_password correspond au mot de passe stocké.
     * On le fait dans after() plutôt que comme rule pour ne pas exposer le hash
     * dans les messages d'erreur Laravel.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if (! Hash::check($this->input('current_password', ''), $this->user()->password)) {
                $v->errors()->add('current_password', 'Le mot de passe actuel est incorrect.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'password.different' => 'Le nouveau mot de passe doit être différent de l\'actuel.',
            'password.confirmed' => 'La confirmation ne correspond pas.',
        ];
    }
}
