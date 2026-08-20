<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Nom : unicode letters + espaces + tirets + apostrophes (bloque
            // chiffres et injections)
            'name'    => ['required', 'string', 'max:120', 'regex:/^[\p{L}\s\'-]+$/u'],
            // Email : rfc + dns (rejette abc@abc.abc et emails fake)
            'email'   => ['required', 'email:rfc,dns', 'max:180'],
            // Téléphone : optionnel, chiffres/+/espaces/tirets/points/parenthèses
            'phone'   => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9\s().-]{8,30}$/'],
            'subject' => ['nullable', 'string', 'max:200'],
            'message' => ['required', 'string', 'min:20', 'max:3000'],
            // Honeypot : champ 'website' invisible côté client. Si rempli = bot.
            // Le contrôleur gère la logique (renvoie 201 factice sans écrire).
            'website' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'Votre nom est obligatoire.',
            'name.regex'       => 'Votre nom ne peut contenir que des lettres.',
            'email.required'   => 'Une adresse email est requise pour vous répondre.',
            'email.email'      => 'Adresse email invalide.',
            'phone.regex'      => 'Numéro de téléphone invalide.',
            'message.required' => 'Le message ne peut pas être vide.',
            'message.min'      => 'Votre message doit contenir au moins 20 caractères.',
        ];
    }
}
