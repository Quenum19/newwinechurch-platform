<?php

namespace App\Http\Requests\Leader;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Enregistrement batch des présences d'une réunion de cellule.
 *
 * Payload attendu :
 * {
 *   meeting_date: "2026-05-10",
 *   attendances: [
 *     {member_id: 12, is_present: true, arrived_late: false, note: null},
 *     ...
 *   ]
 * }
 *
 * Le contrôleur vérifie que chaque member_id appartient bien à la cellule
 * du leader (cf $request->leader_cell_id injecté par le middleware).
 */
class StoreCellAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage cell attendance') ?? false;
    }

    public function rules(): array
    {
        return [
            'meeting_date'              => ['required', 'date', 'before_or_equal:today'],
            'attendances'               => ['required', 'array', 'min:1', 'max:200'],
            'attendances.*.member_id'   => ['required', 'integer', 'exists:users,id'],
            'attendances.*.is_present'  => ['required', 'boolean'],
            'attendances.*.arrived_late'=> ['nullable', 'boolean'],
            'attendances.*.note'        => ['nullable', 'string', 'max:255'],
        ];
    }
}
