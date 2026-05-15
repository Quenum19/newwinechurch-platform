<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la soumission d'une demande de prière depuis le site public.
 *
 * Si l'utilisateur est connecté, name/email sont optionnels (déduits du compte).
 * Sinon, name est obligatoire (et email recommandé pour la confirmation).
 */
class StorePrayerRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // accès public — toute personne peut soumettre
    }

    public function rules(): array
    {
        $isGuest = ! $this->user();

        return [
            'name'         => [$isGuest ? 'required' : 'nullable', 'string', 'max:120'],
            'email'        => ['nullable', 'email', 'max:180'],
            'request'      => ['required', 'string', 'min:10', 'max:2000'],
            'category'     => ['nullable', 'in:health,family,work,finance,spiritual,other'],
            'is_anonymous' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'Merci d\'indiquer votre nom (ou cochez « anonyme »).',
            'request.required' => 'Veuillez décrire votre demande de prière.',
            'request.min'      => 'Votre demande doit contenir au moins 10 caractères.',
            'request.max'      => 'Votre demande ne peut pas dépasser 2000 caractères.',
        ];
    }
}
