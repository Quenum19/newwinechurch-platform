<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\GuestScannerToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * GuestScannerService — Étape C.
 *
 * Crée un scanner externe (non-membre) invité par magic-link :
 *  1. Un User "invité" (status = guest_scanner, mot de passe aléatoire).
 *  2. Un EventStaff row grant=scanner (le rend éligible aux scans scopés).
 *  3. Un GuestScannerToken avec token secret 64 chars, expire fin_event + TTL.
 *  4. Assigne le rôle Spatie `guest-scanner` (firstOrCreate) → passe le AuthGuard.
 *
 * Retour : le token brut + le lien complet — affichés UNE seule fois côté UI,
 * puis masqués (le manager doit régénérer s'il l'a perdu).
 */
class GuestScannerService
{
    /**
     * Invite un nouveau scanner externe.
     *
     * @param  Event  $event
     * @param  User   $inviter        Manager/scanner_lead qui invite
     * @param  array{display_name:string, contact:?string, contact_type:string}  $data
     * @return array{guest:GuestScannerToken, user:User, magic_link:string}
     */
    public function invite(Event $event, User $inviter, array $data): array
    {
        // Contact_type = email : refuse si compte NWC existe déjà (évite fusion accidentelle).
        if ($data['contact_type'] === 'email' && ! empty($data['contact'])) {
            $existing = User::where('email', $data['contact'])->first();
            if ($existing) {
                throw new \DomainException(
                    "Cette adresse email correspond déjà à un membre NWC. Utilise plutôt \"Ajouter un staff\" pour l'ajouter comme scanner interne."
                );
            }
        }

        return DB::transaction(function () use ($event, $inviter, $data) {
            $user = $this->createGuestUser($data);
            $this->ensureGuestScannerRole();
            $user->assignRole('guest-scanner');

            // Grant scanner sur cet event uniquement.
            EventStaff::create([
                'event_id'       => $event->id,
                'user_id'        => $user->id,
                'grant'          => EventStaff::GRANT_SCANNER,
                'assigned_by_id' => $inviter->id,
                'assigned_at'    => now(),
            ]);

            $tokenValue = GuestScannerToken::generateToken();
            $expiresAt = $this->computeExpiration($event);

            $token = GuestScannerToken::create([
                'event_id'      => $event->id,
                'user_id'       => $user->id,
                'token'         => $tokenValue,
                'display_name'  => $data['display_name'],
                'contact'       => $data['contact'] ?? null,
                'contact_type'  => $data['contact_type'],
                'status'        => GuestScannerToken::STATUS_ACTIVE,
                'expires_at'    => $expiresAt,
                'created_by_id' => $inviter->id,
            ]);

            return [
                'guest'      => $token,
                'user'       => $user,
                'magic_link' => $this->buildMagicLink($tokenValue),
                'raw_token'  => $tokenValue,
            ];
        });
    }

    /**
     * Régénère le token d'un invité existant (utile si le lien est perdu).
     * L'ancien token devient inutilisable (le champ token est écrasé).
     */
    public function regenerate(GuestScannerToken $existing, Event $event): array
    {
        if ($existing->status === GuestScannerToken::STATUS_REVOKED) {
            throw new \DomainException('Ce scanner invité est révoqué. Crée une nouvelle invitation.');
        }

        $tokenValue = GuestScannerToken::generateToken();
        $expiresAt = $this->computeExpiration($event);

        $existing->update([
            'token'      => $tokenValue,
            'expires_at' => $expiresAt,
            'status'     => GuestScannerToken::STATUS_ACTIVE,
        ]);

        return [
            'guest'      => $existing->fresh(),
            'magic_link' => $this->buildMagicLink($tokenValue),
            'raw_token'  => $tokenValue,
        ];
    }

    protected function createGuestUser(array $data): User
    {
        $email = ! empty($data['contact']) && $data['contact_type'] === 'email'
            ? $data['contact']
            : 'guest-' . Str::lower(Str::random(10)) . '@nwc-guest.local';

        return User::create([
            'first_name'        => $data['display_name'],
            // Le champ `name` (nom de famille) est NOT NULL. On y met "(Invité)"
            // pour identifier visuellement les comptes créés via magic-link.
            'name'              => '(Invité scanner)',
            'email'             => $email,
            'phone'             => $data['contact_type'] === 'whatsapp' ? ($data['contact'] ?? null) : null,
            'password'          => Str::random(40), // hashed via User cast, jamais utilisé
            'status'            => 'guest_scanner',
            'email_verified_at' => now(),
            'is_baptized'       => false,
            'must_change_password' => false,
        ]);
    }

    /**
     * Rôle Spatie `guest-scanner` — créé une seule fois, sans permission globale.
     * Sert uniquement à passer le AuthGuard sur /scan côté frontend.
     * L'autorisation réelle du scan est faite via EventPolicy::scan (grant scopé).
     */
    protected function ensureGuestScannerRole(): void
    {
        Role::firstOrCreate([
            'name'       => 'guest-scanner',
            'guard_name' => 'web',
        ]);
    }

    /**
     * Expiration = ends_at + TTL config (défaut 6h post-event).
     * Fallback si ends_at absent : starts_at + 6h + TTL.
     */
    protected function computeExpiration(Event $event): \Carbon\Carbon
    {
        $base = $event->ends_at ?: ($event->starts_at ? $event->starts_at->copy()->addHours(6) : now()->addDay());
        $ttl  = (int) config('tickets.guest_scanner_token_ttl_after_event_hours', 6);
        return $base->copy()->addHours($ttl);
    }

    /**
     * Construit l'URL complète du magic-link à copier / envoyer via
     * WhatsApp/email.
     *
     * Le lien pointe VERS LE FRONTEND (pas l'API), qui appellera ensuite
     * l'endpoint public de vérification puis redeem.
     */
    protected function buildMagicLink(string $token): string
    {
        $base = rtrim(config('app.frontend_url') ?: config('app.url'), '/');
        return $base . '/scanner-invite/' . $token;
    }
}
