<?php

namespace App\Http\Requests\Admin;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSermonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('edit sermons') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'               => ['sometimes', 'required', 'string', 'max:200'],
            'title_en'            => ['nullable', 'string', 'max:200'],
            'description'         => ['nullable', 'string', 'max:5000'],
            'description_en'      => ['nullable', 'string', 'max:5000'],
            'speaker_id'            => ['nullable', 'integer', Rule::exists('users', 'id')],
            // Prédicateur externe (invité sans compte) — exclusif avec speaker_id.
            'external_speaker_name' => ['nullable', 'string', 'max:150'],
            'series_id'             => ['nullable', 'integer', Rule::exists('sermon_series', 'id')],
            'scripture_reference' => ['nullable', 'string', 'max:120'],
            'sermon_date'         => ['sometimes', 'required', 'date'],
            'type'                => ['sometimes', 'required', 'in:audio,video,live_replay'],
            'video_url'           => ['nullable', 'url', 'max:500'],
            'audio_url'           => ['nullable', 'url', 'max:500'],
            'youtube_url'         => ['nullable', 'url', 'max:500'],
            // SafeUploadedFile non appliqué sur audio/vidéo : signatures binaires
            // mp4/m4a peuvent déclencher des faux positifs sur "MZ". `mimes:` couvre.
            'audio_file'          => ['nullable', 'file',
                                      'mimes:mp3,wav,m4a,aac,ogg,opus',
                                      'max:204800'],   // 200 Mo
            'video_file'          => ['nullable', 'file',
                                      'mimes:mp4,mov,webm,m4v',
                                      'max:512000'],   // 500 Mo
            'duration_seconds'    => ['nullable', 'integer', 'min:0', 'max:36000'],
            'is_featured'         => ['nullable', 'boolean'],
            'is_published'        => ['nullable', 'boolean'],
            // Vignette : durcissement strict via SafeUploadedFile.
            'thumbnail'           => ['nullable', 'file',
                                      'mimes:jpg,jpeg,png,webp',
                                      'max:30720',
                                      new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ];
    }
}
