<?php

namespace App\Http\Requests\Leader;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Mise à jour d'un rapport de cellule.
 * Autorisé uniquement si status=draft (vérifié par CellReportPolicy::update).
 */
class UpdateCellReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('submit cell reports') ?? false;
    }

    public function rules(): array
    {
        return [
            'attendance_count'  => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'new_members'       => ['sometimes', 'integer', 'min:0', 'max:200'],
            'prayer_requests'   => ['nullable', 'array', 'max:50'],
            'prayer_requests.*.title'     => ['required_with:prayer_requests', 'string', 'max:200'],
            'prayer_requests.*.requester' => ['nullable', 'string', 'max:200'],
            'prayer_requests.*.urgency'   => ['nullable', 'in:low,medium,high'],
            'activities'        => ['nullable', 'array', 'max:50'],
            'activities.*.type'        => ['required_with:activities', 'string', 'max:60'],
            'activities.*.description' => ['nullable', 'string', 'max:500'],
            'activities.*.date'        => ['nullable', 'date'],
            'activities.*.count'       => ['nullable', 'integer', 'min:0'],
            'challenges'        => ['nullable', 'string', 'max:5000'],
            'highlights'        => ['nullable', 'string', 'max:5000'],
            'needs_followup'    => ['nullable', 'boolean'],
        ];
    }

    protected function passedValidation(): void
    {
        foreach (['challenges', 'highlights'] as $key) {
            if ($this->has($key) && is_string($this->{$key})) {
                $this->merge([$key => strip_tags($this->{$key})]);
            }
        }
    }
}
