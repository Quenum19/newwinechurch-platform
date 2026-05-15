<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Soumission d'un rapport hebdomadaire de cellule par le leader.
 * NB : autorisation fine via CellPolicy::submitReport dans le controller.
 *
 * Refonte Étape 1 : attendees_count → attendance_count, new_converts → new_members,
 * testimony → highlights, prayer_requests/activities passent en JSON structuré.
 */
class StoreCellReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('submit cell reports') ?? false;
    }

    public function rules(): array
    {
        return [
            'week_start'        => ['required', 'date'],
            'week_end'          => ['nullable', 'date', 'after_or_equal:week_start'],
            'attendance_count'  => ['required', 'integer', 'min:0', 'max:1000'],
            'new_members'       => ['nullable', 'integer', 'min:0', 'max:200'],
            // JSON structurés : [{title, requester, urgency}, ...]
            'prayer_requests'   => ['nullable', 'array', 'max:50'],
            'prayer_requests.*.title'     => ['required_with:prayer_requests', 'string', 'max:200'],
            'prayer_requests.*.requester' => ['nullable', 'string', 'max:200'],
            'prayer_requests.*.urgency'   => ['nullable', 'in:low,medium,high'],
            // [{type, description, date, count}, ...]
            'activities'        => ['nullable', 'array', 'max:50'],
            'activities.*.type'        => ['required_with:activities', 'string', 'max:60'],
            'activities.*.description' => ['nullable', 'string', 'max:500'],
            'activities.*.date'        => ['nullable', 'date'],
            'activities.*.count'       => ['nullable', 'integer', 'min:0'],
            'challenges'        => ['nullable', 'string', 'max:5000'],
            'highlights'        => ['nullable', 'string', 'max:5000'],
            'needs_followup'    => ['nullable', 'boolean'],
            'status'            => ['nullable', 'in:draft,submitted'],
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
