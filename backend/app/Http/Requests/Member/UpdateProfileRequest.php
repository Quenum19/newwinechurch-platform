<?php

namespace App\Http\Requests\Member;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mise à jour du profil du membre connecté.
 *
 * Note : l'email NE peut PAS être modifié ici (sécurité). Si un membre veut
 * changer d'email, il faut un endpoint dédié avec re-vérification.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'required', 'string', 'max:80'],
            'name'       => ['sometimes', 'required', 'string', 'max:80'],
            'phone'      => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'gender'     => ['nullable', 'in:M,F'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'address'    => ['nullable', 'string', 'max:200'],
            'city'       => ['nullable', 'string', 'max:100'],
            'bio'        => ['nullable', 'string', 'max:1000'],

            // Fiche membre complète (remplie depuis l'espace profil).
            'profession'              => ['nullable', 'string', 'max:120'],
            'education_level'         => ['nullable', 'string', 'max:120'],
            'residence_area'          => ['nullable', 'string', 'max:120'],
            'congregation'            => ['nullable', 'string', 'max:120'],
            'mountain'                => ['nullable', 'string', 'max:120'],
            'mentor_name'             => ['nullable', 'string', 'max:120'],
            'emergency_contact_name'  => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'joined_at'               => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * Sanitisation : strip toute balise HTML de la bio (XSS).
     */
    protected function passedValidation(): void
    {
        if ($this->has('bio') && is_string($this->bio)) {
            $this->merge(['bio' => strip_tags($this->bio)]);
        }
    }
}
