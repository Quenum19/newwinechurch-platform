<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventStaffResource;
use App\Http\Resources\GuestScannerTokenResource;
use App\Models\Event;
use App\Models\EventStaff;
use App\Models\GuestScannerToken;
use App\Mail\EventStaffGrantedMail;
use App\Models\User;
use App\Notifications\EventStaffGrantedNotification;
use App\Services\GuestScannerService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

/**
 * Panneau Staff événement — Étape B.
 *
 *  GET    /admin/events/{eventId}/staff           → liste (managers, scanner_leads, scanners, guests)
 *  POST   /admin/events/{eventId}/staff           → attribuer un grant à un user existant
 *  DELETE /admin/events/{eventId}/staff/{staffId} → révoquer (soft, bouton Retirer)
 *  PATCH  /admin/events/{eventId}/guest-scanners/{tokenId} → suspendre/réactiver
 *  DELETE /admin/events/{eventId}/guest-scanners/{tokenId} → révoquer définitivement
 *  GET    /admin/users/search?q=…                 → autocomplete search user
 *
 * L'INVITATION de scanners externes (création magic-link) est Étape C.
 * Étape B ne gère que la LECTURE + RÉVOCATION des tokens invités.
 */
class EventStaffController extends Controller
{
    // Laravel 11+ : le controller de base n'inclut plus AuthorizesRequests par
    // défaut. On l'ajoute ici pour pouvoir utiliser $this->authorize('...').
    use AuthorizesRequests;

    public function __construct(private GuestScannerService $guests) {}

    /**
     * Liste complète du staff d'un event : grants + magic-links invités.
     * Autorisation : scanner_lead OU manager (via EventPolicy::viewStaff).
     */
    public function index(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize('viewStaff', $event);

        // ⚠️ `grant` est un mot réservé MySQL/MariaDB → on l'échappe avec des
        // backticks dans le orderByRaw pour éviter "syntax error near 'grant, ...'".
        $staff = $event->staff()
            ->with(['user:id,first_name,name,email,phone,avatar', 'assigner:id,first_name,name'])
            ->orderByRaw("FIELD(`grant`, 'manager','scanner_lead','scanner')")
            ->orderByDesc('assigned_at')
            ->get();

        $guests = $event->guestScannerTokens()
            ->with('createdBy:id,first_name,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'staff'  => EventStaffResource::collection($staff),
            'guests' => GuestScannerTokenResource::collection($guests),
        ]);
    }

    /**
     * Attribue un grant à un user existant (recherché par le manager).
     * Body : { user_id: int, grant: 'manager'|'scanner_lead'|'scanner' }
     *
     * Autorisation :
     *  - grant=manager      → seul un manager peut promouvoir
     *  - grant=scanner_lead → manager uniquement
     *  - grant=scanner      → manager OU scanner_lead
     */
    public function store(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);

        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'grant'   => ['required', Rule::in([
                EventStaff::GRANT_MANAGER,
                EventStaff::GRANT_SCANNER_LEAD,
                EventStaff::GRANT_SCANNER,
            ])],
        ]);

        if ($data['grant'] === EventStaff::GRANT_SCANNER) {
            $this->authorize('manageScanners', $event);
        } else {
            // manager / scanner_lead : seul un manager peut attribuer
            $this->authorize('manageManagers', $event);
        }

        // Try/catch pour renvoyer une erreur claire au frontend au lieu du
        // "Server Error" générique de Laravel prod. Loggue aussi pour audit.
        try {
            $existing = EventStaff::where('event_id', $event->id)
                ->where('user_id', $data['user_id'])
                ->first();

            // Détection doublon : même user + même grant + actif → blocage UX.
            if ($existing && $existing->grant === $data['grant'] && $existing->isActive()) {
                $labels = [
                    'manager'      => 'manager',
                    'scanner_lead' => 'chef sécurité',
                    'scanner'      => 'scanner',
                ];
                $userTarget = User::find($data['user_id']);
                $name = $userTarget?->first_name ?? 'Cet utilisateur';
                return response()->json([
                    'message' => "{$name} est déjà {$labels[$data['grant']]} sur cet événement.",
                ], 422);
            }

            if ($existing) {
                // Réactivation ou changement de grant (promote/demote).
                $wasRevoked = ! $existing->isActive();
                $wasOtherGrant = $existing->grant !== $data['grant'];
                $existing->update([
                    'grant'          => $data['grant'],
                    'revoked_at'     => null,
                    'revoked_by_id'  => null,
                    'revoke_reason'  => null,
                    'assigned_by_id' => $request->user()->id,
                    'assigned_at'    => now(),
                ]);
                $staff = $existing;
                $verb = $wasRevoked ? 'réactivé' : ($wasOtherGrant ? 'grant mis à jour' : 'ajouté');
            } else {
                $staff = EventStaff::create([
                    'event_id'       => $event->id,
                    'user_id'        => $data['user_id'],
                    'grant'          => $data['grant'],
                    'assigned_by_id' => $request->user()->id,
                    'assigned_at'    => now(),
                ]);
                $verb = 'ajouté';
            }

            $staff->load(['user:id,first_name,name,email,phone,avatar', 'assigner:id,first_name,name']);

            // Étape F — Notification multi-canal (bell + mail + broadcast).
            // Skip pour les guests scanners (déjà géré via magic-link).
            $isGuest = $staff->user
                && ($staff->user->status === 'guest_scanner' || $staff->user->hasRole('guest-scanner'));
            if (! $isGuest && $staff->user) {
                try {
                    $staff->user->notify(
                        new EventStaffGrantedNotification($event, $data['grant'], $request->user()),
                    );
                } catch (\Throwable $e) {
                    \Log::warning('EventStaffGrantedNotification dispatch failed', ['err' => $e->getMessage()]);
                }
            }

            return response()->json([
                'message' => "Staff {$verb}.",
                'staff'   => new EventStaffResource($staff),
            ], 201);
        } catch (\Throwable $e) {
            \Log::error('EventStaff store failed', [
                'event_id' => $event->id,
                'user_id'  => $data['user_id'] ?? null,
                'grant'    => $data['grant']   ?? null,
                'error'    => $e->getMessage(),
                'file'     => $e->getFile() . ':' . $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Erreur ajout staff : ' . $e->getMessage(),
                'debug'   => [
                    'class' => class_basename($e),
                    'file'  => basename($e->getFile()) . ':' . $e->getLine(),
                ],
            ], 500);
        }
    }

    /**
     * Renvoie la notification email d'attribution à un staff — bouton
     * "Renvoyer notification" dans le panneau Staff. Utile si le mail
     * initial a été perdu / classé en spam.
     */
    public function resendNotification(Request $request, int $eventId, int $staffId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize('viewStaff', $event);

        $staff = EventStaff::where('event_id', $eventId)
            ->with('user', 'assigner')
            ->findOrFail($staffId);

        if (! $staff->isActive()) {
            return response()->json(['message' => 'Ce staff est révoqué.'], 422);
        }

        if (! $staff->user || ! $staff->user->email) {
            return response()->json(['message' => 'Ce staff n\'a pas d\'email.'], 422);
        }

        // Skip les guests (déjà géré par magic-link).
        if ($staff->user->status === 'guest_scanner' || $staff->user->hasRole('guest-scanner')) {
            return response()->json([
                'message' => 'Ce staff est un invité magic-link → utilise le bouton "Renvoyer le lien" dans la section Scanners externes.',
            ], 422);
        }

        try {
            $staff->user->notify(
                new EventStaffGrantedNotification($event, $staff->grant, $staff->assigner ?? $request->user()),
            );
            return response()->json([
                'message' => "Notification renvoyée à {$staff->user->email}.",
            ]);
        } catch (\Throwable $e) {
            \Log::error('resendNotification failed', [
                'staff_id' => $staffId, 'err' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Erreur envoi : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Révoque (soft) un grant — bouton "Retirer".
     * Autorisation dépend du grant révoqué (manager: manager, scanner: scanner_lead).
     */
    public function destroy(Request $request, int $eventId, int $staffId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $staff = EventStaff::where('event_id', $eventId)->findOrFail($staffId);

        if ($staff->grant === EventStaff::GRANT_SCANNER) {
            $this->authorize('manageScanners', $event);
        } else {
            $this->authorize('manageManagers', $event);
        }

        if (! $staff->isActive()) {
            return response()->json(['message' => 'Ce grant est déjà révoqué.'], 422);
        }

        // Garde-fou : ne pas se retirer soi-même si on est le SEUL manager actif.
        if ($staff->user_id === $request->user()->id
            && $staff->grant === EventStaff::GRANT_MANAGER) {
            $activeManagers = EventStaff::where('event_id', $eventId)
                ->where('grant', EventStaff::GRANT_MANAGER)
                ->whereNull('revoked_at')
                ->count();
            if ($activeManagers <= 1) {
                return response()->json([
                    'message' => 'Impossible de se retirer : tu es le seul manager de cet event. Ajoute un autre manager d\'abord.',
                ], 422);
            }
        }

        $staff->update([
            'revoked_at'    => now(),
            'revoked_by_id' => $request->user()->id,
            'revoke_reason' => $request->input('reason'),
        ]);

        return response()->json(['message' => 'Staff retiré de l\'événement.']);
    }

    /**
     * Suspend / réactive un magic-link invité.
     * Body : { status: 'active' | 'suspended' }
     */
    public function updateGuest(Request $request, int $eventId, int $tokenId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize('manageScanners', $event);

        $data = $request->validate([
            'status' => ['required', Rule::in([
                GuestScannerToken::STATUS_ACTIVE,
                GuestScannerToken::STATUS_SUSPENDED,
            ])],
        ]);

        $token = GuestScannerToken::where('event_id', $eventId)->findOrFail($tokenId);

        if ($token->status === GuestScannerToken::STATUS_REVOKED) {
            return response()->json(['message' => 'Ce token est révoqué définitivement.'], 422);
        }

        $token->update(['status' => $data['status']]);

        return response()->json([
            'message' => $data['status'] === GuestScannerToken::STATUS_SUSPENDED
                ? 'Accès suspendu.' : 'Accès réactivé.',
            'guest'   => new GuestScannerTokenResource($token->fresh()->load('createdBy')),
        ]);
    }

    /**
     * Révoque définitivement un magic-link invité.
     * Le row est conservé (audit) mais status=revoked → plus aucun scan possible.
     */
    public function destroyGuest(Request $request, int $eventId, int $tokenId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize('manageScanners', $event);

        $token = GuestScannerToken::where('event_id', $eventId)->findOrFail($tokenId);
        $token->update(['status' => GuestScannerToken::STATUS_REVOKED]);

        return response()->json(['message' => 'Scanner invité révoqué.']);
    }

    /**
     * Invite un scanner externe (non-membre) via magic-link — Étape C.
     * Autorisation : manager OU scanner_lead (respo Sécurité).
     *
     * Body : { display_name: string, contact: ?string, contact_type: 'email'|'whatsapp' }
     * Retour : { guest, magic_link, raw_token } — token brut affiché UNE fois.
     */
    public function inviteGuest(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize('manageScanners', $event);

        $data = $request->validate([
            'display_name' => ['required', 'string', 'min:2', 'max:120'],
            'contact_type' => ['required', Rule::in(['email', 'whatsapp'])],
            'contact'      => ['nullable', 'string', 'max:180'],
        ]);

        // Contact requis si type=email OU si type=whatsapp (pour envoyer le lien).
        if (empty($data['contact'])) {
            return response()->json([
                'message' => 'Un contact est requis pour envoyer le lien.',
                'errors'  => ['contact' => ['Champ requis.']],
            ], 422);
        }

        try {
            $result = $this->guests->invite($event, $request->user(), $data);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $result['guest']->load('createdBy');

        return response()->json([
            'message'    => 'Scanner invité créé. Copie ou envoie le lien.',
            'guest'      => new GuestScannerTokenResource($result['guest']),
            'magic_link' => $result['magic_link'],
        ], 201);
    }

    /**
     * Régénère un magic-link (utile si le lien a été perdu ou compromis).
     * L'ancien token devient invalide.
     */
    public function regenerateGuest(Request $request, int $eventId, int $tokenId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize('manageScanners', $event);

        $token = GuestScannerToken::where('event_id', $eventId)->findOrFail($tokenId);

        try {
            $result = $this->guests->regenerate($token, $event);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'    => 'Nouveau lien généré. L\'ancien est invalidé.',
            'guest'      => new GuestScannerTokenResource($result['guest']->load('createdBy')),
            'magic_link' => $result['magic_link'],
        ]);
    }

    /**
     * Autocomplete search user par nom / prénom / email / téléphone.
     * Utilisé par le modal "Ajouter un staff" côté frontend.
     *
     * GET /admin/users/search?q=jean&limit=10
     */
    public function searchUsers(Request $request): JsonResponse
    {
        // Cette recherche est accessible dès qu'on peut gérer un event (au minimum
        // un scanner_lead) — le contrôle fin se fait à l'attribution du grant.
        abort_unless(
            $request->user()?->hasAnyRole(['superadmin', 'admin', 'pasteur', 'rh'])
            || $request->user()?->eventStaff()->active()->exists(),
            403
        );

        $q = trim((string) $request->query('q', ''));
        $limit = min((int) $request->query('limit', 10), 25);

        if (mb_strlen($q) < 2) {
            return response()->json(['data' => []]);
        }

        $users = User::query()
            ->where(function ($w) use ($q) {
                $w->where('email', 'like', "%{$q}%")
                  ->orWhere('name', 'like', "%{$q}%")
                  ->orWhere('first_name', 'like', "%{$q}%")
                  ->orWhere('phone', 'like', "%{$q}%");
            })
            ->select(['id', 'first_name', 'name', 'email', 'phone', 'avatar'])
            ->orderBy('first_name')
            ->limit($limit)
            ->get()
            ->map(fn ($u) => [
                'id'     => $u->id,
                'name'   => trim(($u->first_name ?? '').' '.($u->name ?? '')),
                'email'  => $u->email,
                'phone'  => $u->phone,
                'avatar' => $u->avatar_url,
            ]);

        return response()->json(['data' => $users]);
    }
}
