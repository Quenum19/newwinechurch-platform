<?php

namespace App\Http\Requests\Admin;

use App\Rules\SafeUploadedFile;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create posts') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'        => ['required', 'string', 'max:200'],
            'excerpt'      => ['nullable', 'string', 'max:500'],
            'content'      => ['required', 'string', 'max:60000'],
            'category_id'  => ['nullable', 'integer', Rule::exists('post_categories', 'id')],
            'status'       => ['nullable', 'in:draft,published,archived'],
            'is_featured'  => ['nullable', 'boolean'],
            // Image de couverture : durcissement strict via SafeUploadedFile
            // (magic bytes + signatures interdites comme <?php caché dans une image).
            'cover_image'  => ['nullable', 'file',
                               'mimes:jpg,jpeg,png,webp',
                               'max:30720',
                               new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ];
    }

    /**
     * Sanitisation HTML stricte du contenu Tiptap (anti-XSS).
     *
     * IMPORTANT : on utilise prepareForValidation() (et non passedValidation())
     * pour que $request->safe() / $request->validated() renvoient bien la
     * version nettoyée. passedValidation() est trop tard car le validator
     * a déjà figé les données safe.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('content') && is_string($this->content)) {
            $this->merge(['content' => HtmlSanitizer::clean($this->content)]);
        }
        if ($this->has('excerpt') && is_string($this->excerpt)) {
            $this->merge(['excerpt' => strip_tags($this->excerpt)]);
        }
    }
}
