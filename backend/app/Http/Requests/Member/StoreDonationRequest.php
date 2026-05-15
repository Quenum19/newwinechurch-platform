<?php

namespace App\Http\Requests\Member;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Soumission d'un don (workflow déclaratif Mobile Money).
 *
 * Le donateur peut être anonyme (user_id null) ou connecté.
 * On accepte la référence Mobile Money saisie par l'utilisateur ;
 * l'admin la vérifie ensuite manuellement.
 */
class StoreDonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // accessible aux invités aussi
    }

    public function rules(): array
    {
        return [
            'amount'      => ['required', 'numeric', 'min:100', 'max:10000000'],
            'currency'    => ['nullable', 'in:XOF,EUR,USD'],
            'method'      => ['required', 'in:orange_money,wave,mtn_momo,card,cash,other'],
            'reference'   => [
                'nullable', 'string', 'max:80',
                Rule::unique('donations', 'reference')->whereNotNull('reference'),
            ],
            'type'        => ['nullable', 'in:tithe,offering,mission,building,other'],
            'donor_name'  => ['nullable', 'string', 'max:120'],
            'donor_phone' => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'note'        => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min'       => 'Le montant minimum est de 100 FCFA.',
            'reference.unique' => 'Cette référence a déjà été utilisée. Vérifiez votre transfert.',
        ];
    }
}
