<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StoreNewsletterSubscriberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email', 'max:180'],
            'name'     => ['nullable', 'string', 'max:120'],
            'language' => ['nullable', 'in:fr,en'],
        ];
    }
}
