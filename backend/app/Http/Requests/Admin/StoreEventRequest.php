<?php

namespace App\Http\Requests\Admin;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create events') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'                 => ['required', 'string', 'max:200'],
            'description'           => ['required', 'string', 'max:10000'],
            'type'                  => ['required', 'in:culte,priere,evangelisation,concert,formation,autre'],
            'location'              => ['nullable', 'string', 'max:200'],
            'address'               => ['nullable', 'string', 'max:200'],
            'starts_at'             => ['required', 'date', 'after:now'],
            'ends_at'               => ['nullable', 'date', 'after:starts_at'],
            'max_attendees'         => ['nullable', 'integer', 'min:1', 'max:100000'],
            'registration_required' => ['nullable', 'boolean'],
            'registration_deadline' => ['nullable', 'date', 'before:starts_at'],
            'is_online'             => ['nullable', 'boolean'],
            'online_link'           => ['nullable', 'url', 'max:500'],
            'is_featured'           => ['nullable', 'boolean'],
            'is_published'          => ['nullable', 'boolean'],
            // Image originale acceptée jusqu'à 30 Mo, peu importe les dimensions.
            // Le serveur redimensionne et convertit en WebP avant stockage.
            // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'cover_image'           => ['nullable', 'file',
                                        'mimes:jpg,jpeg,png,webp',
                                        'max:30720',
                                        new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ];
    }
}
