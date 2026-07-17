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
            'title_en'              => ['nullable', 'string', 'max:200'],       // i18n
            'description'           => ['required', 'string', 'max:10000'],
            'description_en'        => ['nullable', 'string', 'max:10000'],     // i18n
            'type'                  => ['required', 'in:culte,priere,evangelisation,concert,formation,autre'],
            'location'              => ['nullable', 'string', 'max:200'],
            'location_en'           => ['nullable', 'string', 'max:200'],       // i18n
            'address'               => ['nullable', 'string', 'max:200'],
            // NB : on autorise les dates passées (archives, events historiques).
            // L'admin gère la pertinence — le frontend trie passé/futur via
            // une colonne calculée côté API (events à venir vs archives).
            'starts_at'             => ['required', 'date'],
            'ends_at'               => ['nullable', 'date', 'after_or_equal:starts_at'],
            'max_attendees'         => ['nullable', 'integer', 'min:1', 'max:100000'],
            'registration_required' => ['nullable', 'boolean'],
            // Pour un event passé, la deadline d'inscription n'a plus de sens.
            // On garde la contrainte before:starts_at pour cohérence si l'admin
            // crée un event futur AVEC inscriptions.
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
            // === Billetterie (Phase 1) ===
            'ticketing_enabled'     => ['nullable', 'boolean'],
            'tickets_capacity'      => ['nullable', 'integer', 'min:1', 'max:100000'],
            'tickets_per_email_max' => ['nullable', 'integer', 'min:1', 'max:10'],
            'tickets_closes_at'     => ['nullable', 'date', 'before_or_equal:starts_at'],
            'require_selfie'        => ['nullable', 'boolean'],
            'allow_waitlist'        => ['nullable', 'boolean'],
            'support_phone'         => ['nullable', 'string', 'max:30'],
            // Phase 7 — Mode paiement
            'payment_mode'          => ['nullable', 'in:declarative,cinetpay'],
        ];
    }
}
