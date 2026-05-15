<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCellRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage cells') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:120'],
            'description'      => ['nullable', 'string', 'max:2000'],
            'leader_id'        => ['required', 'integer', Rule::exists('users', 'id')],
            'zone'             => ['nullable', 'string', 'max:100'],
            'meeting_day'      => ['nullable', 'string', 'max:20'],
            'meeting_time'     => ['nullable', 'date_format:H:i'],
            'meeting_location' => ['nullable', 'string', 'max:200'],
            'status'           => ['nullable', 'in:active,inactive'],
        ];
    }
}
