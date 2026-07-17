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
            'title_en'              => ['nullable', 'string', 'max:200'],       // i18n
            'description'           => ['sometimes', 'required', 'string', 'max:10000'],
            'description_en'        => ['nullable', 'string', 'max:10000'],     // i18n
            'type'                  => ['sometimes', 'required', 'in:culte,priere,evangelisation,concert,formation,autre'],
            'location'              => ['nullable', 'string', 'max:200'],
            'location_en'           => ['nullable', 'string', 'max:200'],       // i18n
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
            // === Billetterie (Phase 1) ===
            'ticketing_enabled'     => ['nullable', 'boolean'],
            'tickets_capacity'      => ['nullable', 'integer', 'min:1', 'max:100000'],
            'tickets_per_email_max' => ['nullable', 'integer', 'min:1', 'max:10'],
            'tickets_closes_at'     => ['nullable', 'date'],
            'require_selfie'        => ['nullable', 'boolean'],
            'allow_waitlist'        => ['nullable', 'boolean'],
            'support_phone'         => ['nullable', 'string', 'max:30'],
            'payment_mode'          => ['nullable', 'in:declarative,cinetpay'],
        ];
    }
}
