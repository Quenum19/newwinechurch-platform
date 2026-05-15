<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Inscription d'un nouveau membre NWC.
 *
 * - Tout en transaction DB (échec partiel = rollback complet)
 * - Email de vérification envoyé en queue (event Registered)
 * - Rôle "membre" automatique
 * - Statut "pending" par défaut (admin valide ensuite)
 */
class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'first_name'  => $data['first_name'],
                'name'        => $data['name'],
                'email'       => strtolower($data['email']),
                'password'    => Hash::make($data['password']),
                'phone'       => $data['phone'] ?? null,
                'gender'      => $data['gender'] ?? null,
                'birth_date'  => $data['birth_date'] ?? null,
                'city'        => $data['city'] ?? null,
                'status'      => 'pending', // l'admin validera l'inscription
                'is_baptized' => false,
                'joined_at'   => now()->toDateString(),
            ]);

            // Rôle "membre" automatique (créé par RolesAndPermissionsSeeder).
            $user->assignRole('membre');

            return $user;
        });

        // Déclenche l'envoi de l'email de vérification (en queue).
        event(new Registered($user));

        // Envoi de l'email de bienvenue (en queue, non bloquant).
        \Illuminate\Support\Facades\Mail::to($user->email)->queue(new \App\Mail\WelcomeMail($user));

        return response()->json([
            'message' => 'Inscription réussie. Vérifiez votre email pour activer votre compte.',
            'user'    => (new UserResource($user->load('roles')))->expose(),
        ], 201);
    }
}
