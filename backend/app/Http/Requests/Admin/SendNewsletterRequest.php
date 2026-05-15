<?php

namespace App\Http\Requests\Admin;

use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation envoi newsletter.
 *
 * On accepte un sujet, un corps HTML (sanitisé) et optionnellement un filtre
 * de langue (envoie aux abonnés FR ou EN). Sans filtre = tous les confirmés.
 */
class SendNewsletterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('send newsletter') ?? false;
    }

    public function rules(): array
    {
        return [
            'subject'  => ['required', 'string', 'min:5', 'max:200'],
            'body'     => ['required', 'string', 'min:20', 'max:100000'],
            'language' => ['nullable', 'in:fr,en'],

            // "test_email" → envoi de test à une seule adresse (pour preview admin).
            'test_email' => ['nullable', 'email'],
        ];
    }

    protected function passedValidation(): void
    {
        if ($this->has('body') && is_string($this->body)) {
            $this->merge(['body' => HtmlSanitizer::clean($this->body)]);
        }
    }
}
