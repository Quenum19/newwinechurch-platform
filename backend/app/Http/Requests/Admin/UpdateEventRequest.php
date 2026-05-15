<?php

namespace App\Http\Requests\Admin;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('edit events') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'                 => ['sometimes', 'required', 'string', 'max:200'],
            'description'           => ['sometimes', 'required', 'string', 'max:10000'],
            'type'                  => ['sometimes', 'required', 'in:culte,priere,evangelisation,concert,formation,autre'],
            'location'              => ['nullable', 'string', 'max:200'],
            'address'               => ['nullable', 'string', 'max:200'],
            'starts_at'             => ['sometimes', 'required', 'date'],
            'ends_at'               => ['nullable', 'date'],
            'max_attendees'         => ['nullable', 'integer', 'min:1', 'max:100000'],
            'registration_required' => ['nullable', 'boolean'],
            'registration_deadline' => ['nullable', 'date'],
            'is_online'             => ['nullable', 'boolean'],
            'online_link'           => ['nullable', 'url', 'max:500'],
            'is_featured'           => ['nullable', 'boolean'],
            'is_published'          => ['nullable', 'boolean'],
            // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'cover_image'           => ['nullable', 'file',
                                        'mimes:jpg,jpeg,png,webp',
                                        'max:30720',
                                        new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ];
    }
}
