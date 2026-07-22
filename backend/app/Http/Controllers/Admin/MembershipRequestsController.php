<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AccountCredentialsMail;
use App\Models\MembershipRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * Admin — Gestion des demandes d'adhésion.
 *
 *  - index   : liste avec filtres (status, search)
 *  - approve : crée un User avec mot de passe par défaut (must_change_password=true)
 *              + envoie email contenant email + password initial
 *  - reject  : met à 'rejected' + raison (optionnelle, envoyée par mail)
 */
class MembershipRequestsController extends Controller
{
    /** Mot de passe par défaut à la création d'un compte par approbation. */
    public const DEFAULT_PASSWORD = 'password';

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view members'), 403);

        // On EXCLUT les enrôlements (workflow séparé, géré depuis la page event).
        // Cette liste ne contient que les demandes du formulaire /rejoindre classique.
        $query = MembershipRequest::query()
            ->whereNull('enrollment_type')
            ->with('processedBy:id,name,first_name')
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 25), 100);
        return response()->json(['data' => $query->paginate($perPage)]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('view members'), 403);

        $req = MembershipRequest::with('processedBy:id,name,first_name', 'user:id,email,status')
            ->findOrFail($id);
        return response()->json(['data' => $req]);
    }

    /** Approve : crée le compte + envoie email avec credentials. */
    public function approve(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('create members'), 403);

        $req = MembershipRequest::findOrFail($id);

        if ($req->status !== 'pending') {
            return response()->json(['message' => 'Cette demande est déjà traitée.'], 422);
        }

        // L'admin peut surcharger le mot de passe initial à l'approbation.
        $data = Validator::make($request->all(), [
            'initial_password' => ['nullable', 'string', 'min:6', 'max:50'],
        ])->validate();
        $initialPassword = $data['initial_password'] ?? self::DEFAULT_PASSWORD;

        $user = DB::transaction(function () use ($req, $initialPassword, $request) {
            // Garde-fou : email pourrait être devenu utilisé entre temps.
            if (User::where('email', $req->email)->exists()) {
                abort(409, 'Un compte existe déjà avec cet email.');
            }

            $u = User::create([
                'first_name'           => $req->first_name,
                'name'                 => $req->name,
                'email'                => strtolower($req->email),
                'phone'                => $req->phone,
                'birth_date'           => $req->birth_date,
                'gender'               => $req->gender,
                'city'                 => $req->city,
                'password'             => Hash::make($initialPassword),
                'must_change_password' => true,
                'status'               => 'active',
                'is_baptized'          => false,
                'joined_at'            => now()->toDateString(),
                'email_verified_at'    => now(), // approuvé par RH = vérifié
            ]);
            $u->assignRole('membre');

            $req->update([
                'status'       => 'approved',
                'processed_by' => $request->user()->id,
                'processed_at' => now(),
                'user_id'      => $u->id,
            ]);

            return $u;
        });

        Mail::to($user->email)->queue(new AccountCredentialsMail($user, $initialPassword));

        activity('admissions')
            ->causedBy($request->user())
            ->performedOn($req)
            ->withProperties(['user_id' => $user->id])
            ->log('Demande d\'adhésion approuvée');

        return response()->json([
            'message' => 'Demande approuvée. Email envoyé au candidat.',
            'data'    => $req->fresh('processedBy', 'user'),
        ]);
    }

    /** Reject : statut + raison facultative. */
    public function reject(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('create members'), 403);

        $req = MembershipRequest::findOrFail($id);

        if ($req->status !== 'pending') {
            return response()->json(['message' => 'Cette demande est déjà traitée.'], 422);
        }

        $data = Validator::make($request->all(), [
            'reason' => ['nullable', 'string', 'max:1000'],
        ])->validate();

        $req->update([
            'status'           => 'rejected',
            'processed_by'     => $request->user()->id,
            'processed_at'     => now(),
            'rejection_reason' => $data['reason'] ?? null,
        ]);

        activity('admissions')
            ->causedBy($request->user())
            ->performedOn($req)
            ->log('Demande d\'adhésion rejetée');

        return response()->json([
            'message' => 'Demande rejetée.',
            'data'    => $req->fresh('processedBy'),
        ]);
    }

    /** Compteur pour badge sidebar admin (demandes pending). */
    public function pendingCount(): JsonResponse
    {
        return response()->json(['count' => MembershipRequest::pending()->count()]);
    }

    /**
     * Action en lot — reject uniquement (l'approbation crée des comptes
     * utilisateurs avec envoi mail, trop sensible pour du bulk silencieux).
     */
    public function bulk(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('create members'), 403);
        $request->validate([
            'action' => ['required', 'in:reject'],
            'ids'    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'  => ['integer'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $count = MembershipRequest::whereIn('id', $request->input('ids'))
            ->where('status', 'pending')
            ->update([
                'status'           => 'rejected',
                'processed_by'     => $request->user()->id,
                'processed_at'     => now(),
                'rejection_reason' => $request->input('reason'),
            ]);
        return response()->json(['message' => "$count demande(s) rejetée(s).", 'count' => $count]);
    }
}
