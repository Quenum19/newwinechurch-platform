<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Validation pour l'inscription d'un nouveau membre NWC.
 *
 * Règles strictes :
 *  - email unique parmi les comptes non supprimés
 *  - mot de passe ≥ 8/10 chars + mixedCase + numbers + symbols (cf AppServiceProvider)
 *  - téléphone optionnel mais format vérifié
 *  - confirmation case-à-cocher RGPD obligatoire
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:80'],
            'name'       => ['required', 'string', 'max:80'],
            'email'      => [
                'required',
                // En prod, on durcit avec validation DNS (MX) pour limiter les faux comptes.
                // En local : 'rfc' suffit (pas de réseau requis).
                app()->environment('production') ? 'email:rfc,dns' : 'email:rfc',
                'max:180',
                Rule::unique('users', 'email')->whereNull('deleted_at'),
            ],
            'phone'      => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'password'   => ['required', 'confirmed', Password::defaults()],

            // Date de naissance OBLIGATOIRE pour les anniversaires du mois (RH).
            'birth_date' => ['required', 'date', 'before:today', 'after:1900-01-01'],

            // Champs optionnels — on les capte si l'utilisateur les remplit.
            'gender'     => ['nullable', 'in:M,F'],
            'city'       => ['nullable', 'string', 'max:100'],

            // Conformité : double opt-in.
            'accept_terms' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required'   => 'Votre prénom est obligatoire.',
            'name.required'         => 'Votre nom est obligatoire.',
            'email.unique'          => 'Cet email est déjà utilisé.',
            'email.email'           => 'L\'adresse email n\'est pas valide.',
            'phone.regex'           => 'Le numéro de téléphone contient des caractères invalides.',
            'password.confirmed'    => 'La confirmation du mot de passe ne correspond pas.',
            'accept_terms.accepted' => 'Vous devez accepter les conditions d\'utilisation.',
            'birth_date.required'   => 'La date de naissance est obligatoire.',
            'birth_date.before'     => 'La date de naissance doit être dans le passé.',
            'birth_date.after'      => 'La date de naissance est invalide.',
        ];
    }
}
