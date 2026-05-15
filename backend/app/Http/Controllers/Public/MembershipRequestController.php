<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\MembershipRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

/**
 * Public — Soumission d'une demande d'adhésion à NWC.
 *
 * NE crée PAS un compte fonctionnel. Crée une entrée `membership_requests`
 * que la RH/admin validera ensuite (création du compte avec mot de passe
 * par défaut + email contenant les credentials).
 */
class MembershipRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $today = now()->toDateString();

        $data = Validator::make($request->all(), [
            'first_name'  => ['required', 'string', 'max:80'],
            'name'        => ['required', 'string', 'max:80'],
            'email'       => [
                'required',
                app()->environment('production') ? 'email:rfc,dns' : 'email:rfc',
                'max:180',
                // Refuse si déjà compte actif OU demande en cours
                Rule::unique('users', 'email')->whereNull('deleted_at'),
                Rule::unique('membership_requests', 'email')->where('status', 'pending'),
            ],
            'phone'       => ['nullable', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],
            'birth_date'  => ['required', 'date', 'before:'.$today, 'after:1900-01-01'],
            'gender'      => ['nullable', 'in:M,F'],
            'city'        => ['nullable', 'string', 'max:100'],
            'referrer'    => ['nullable', 'string', 'max:120'],
            'motivation'  => ['nullable', 'string', 'max:1500'],
            'accept_terms'=> ['accepted'],
        ], [
            'email.unique'        => 'Un compte ou une demande existe déjà avec cet email.',
            'birth_date.required' => 'La date de naissance est obligatoire.',
            'accept_terms.accepted' => 'Vous devez accepter les conditions pour continuer.',
        ])->validate();

        unset($data['accept_terms']);

        $req = MembershipRequest::create($data + ['status' => 'pending']);

        return response()->json([
            'message' => 'Demande reçue. Tu seras contacté(e) par email après validation.',
            'data'    => ['id' => $req->id, 'status' => $req->status],
        ], 201);
    }
}
