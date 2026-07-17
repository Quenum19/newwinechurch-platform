<?php

namespace App\Http\Requests\Admin;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSermonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create sermons') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'               => ['required', 'string', 'max:200'],
            'description'         => ['nullable', 'string', 'max:5000'],
            'speaker_id'            => ['nullable', 'integer', Rule::exists('users', 'id')],
            // Prédicateur externe (invité sans compte) — exclusif avec speaker_id.
            'external_speaker_name' => ['nullable', 'string', 'max:150'],
            'series_id'             => ['nullable', 'integer', Rule::exists('sermon_series', 'id')],
            'scripture_reference' => ['nullable', 'string', 'max:120'],
            'sermon_date'         => ['required', 'date'],
            'type'                => ['required', 'in:audio,video,live_replay'],
            'video_url'           => ['nullable', 'url', 'max:500'],
            'audio_url'           => ['nullable', 'url', 'max:500'],
            'youtube_url'         => ['nullable', 'url', 'max:500'],
            // Upload direct depuis l'ordinateur (alternative aux URLs).
            // Audio prêche jusqu'à 200 Mo (1h+ de message en MP3 standard).
            // Note : on n'applique pas SafeUploadedFile sur audio/vidéo car les
            // signatures binaires de certains conteneurs (mp4/m4a/etc.) peuvent
            // déclencher des faux positifs sur "MZ". La validation `mimes:` reste
            // appliquée + contrôle taille.
            'audio_file'          => ['nullable', 'file',
                                      'mimes:mp3,wav,m4a,aac,ogg,opus',
                                      'max:204800'],
            // Vidéo prêche jusqu'à 500 Mo (HD ~30 minutes).
            'video_file'          => ['nullable', 'file',
                                      'mimes:mp4,mov,webm,m4v',
                                      'max:512000'],
            'duration_seconds'    => ['nullable', 'integer', 'min:0', 'max:36000'],
            'is_featured'         => ['nullable', 'boolean'],
            'is_published'        => ['nullable', 'boolean'],
            // Vignette : durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'thumbnail'           => ['nullable', 'file',
                                      'mimes:jpg,jpeg,png,webp',
                                      'max:30720',
                                      new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ];
    }
}
