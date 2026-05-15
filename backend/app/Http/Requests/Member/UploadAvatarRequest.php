<?php

namespace App\Http\Requests\Member;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Upload d'un avatar — sécurité MIME stricte.
 *
 * Validation :
 *  - Type MIME réel (file()->getMimeType()) ∈ image/jpeg, png, webp, gif
 *  - Taille max 5 Mo
 *  - Dimensions max 4000x4000 (anti-image-bomb)
 *
 * Le redimensionnement / WebP est délégué à un Job en queue
 * (cf ProcessAvatarJob).
 */
class UploadAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'avatar' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,gif',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif',
                'max:5120',                        // 5 Mo en kilobytes
                'dimensions:max_width=4000,max_height=4000',
                // Double sécurité : vérif magic bytes + signature dangereuse (cf SafeUploadedFile).
                new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp', 'gif']),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'avatar.required'    => 'Aucun fichier reçu.',
            'avatar.mimes'       => 'Format accepté : JPG, PNG, WebP, GIF.',
            'avatar.mimetypes'   => 'Le contenu du fichier ne correspond pas à une image valide.',
            'avatar.max'         => 'L\'image ne peut pas dépasser 5 Mo.',
            'avatar.dimensions'  => 'L\'image ne peut pas dépasser 4000×4000 pixels.',
        ];
    }
}
