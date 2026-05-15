<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Assigner / synchroniser les rôles d'un membre.
 * Seuls superadmin et pasteur peuvent attribuer des rôles staff.
 */
class AssignRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('assign roles') ?? false;
    }

    public function rules(): array
    {
        return [
            'roles'   => ['required', 'array'],
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ];
    }

    /**
     * Sécurité : un admin (mais pas superadmin) ne doit pas pouvoir
     * promouvoir quelqu'un superadmin/pasteur.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $sensitive = ['superadmin', 'pasteur'];
            $requested = (array) $this->input('roles', []);
            $assigningSensitive = array_intersect($requested, $sensitive);

            if ($assigningSensitive && ! $this->user()->hasAnyRole($sensitive)) {
                $v->errors()->add('roles', 'Vous ne pouvez pas attribuer ce rôle.');
            }
        });
    }
}
