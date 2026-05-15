<?php

namespace App\Http\Requests\Governor;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Mise à jour du profil gouverneur.
 *
 * Photo profile : max 5 MB.
 * Bannière : max 10 MB.
 * Les images uploadées sont traitées par ProcessGovernorImageJob (resize + WebP).
 */
class UpdateGovernorProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage governor profile') ?? false;
    }

    public function rules(): array
    {
        return [
            'bio'              => ['nullable', 'string', 'max:1000'],
            'phone_direct'     => ['nullable', 'string', 'max:30'],
            'vision_statement' => ['nullable', 'string', 'max:500'],
            'years_in_role'    => ['nullable', 'integer', 'min:0', 'max:50'],
            // Images : max sizes en KB (5 MB / 10 MB).
            // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'photo_profile'    => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:5120',
                                   new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
            'banner_image'     => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:10240',
                                   new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ];
    }

    protected function passedValidation(): void
    {
        foreach (['bio', 'vision_statement'] as $key) {
            if ($this->has($key) && is_string($this->{$key})) {
                $this->merge([$key => strip_tags($this->{$key})]);
            }
        }
    }
}
