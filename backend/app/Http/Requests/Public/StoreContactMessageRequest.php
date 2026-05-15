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
            'name'    => ['required', 'string', 'max:120'],
            'email'   => ['required', 'email', 'max:180'],
            'phone'   => ['nullable', 'string', 'max:30'],
            'subject' => ['nullable', 'string', 'max:200'],
            'message' => ['required', 'string', 'min:20', 'max:3000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'Votre nom est obligatoire.',
            'email.required'   => 'Une adresse email est requise pour vous répondre.',
            'message.required' => 'Le message ne peut pas être vide.',
            'message.min'      => 'Votre message doit contenir au moins 20 caractères.',
        ];
    }
}
