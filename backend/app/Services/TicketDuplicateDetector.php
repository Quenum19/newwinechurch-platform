<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Détection des doublons potentiels dans les tickets d'un événement.
 *
 * 2 niveaux de confiance :
 *  - CERTAIN  : même email OU même téléphone normalisé
 *  - PROBABLE : même nom+prénom normalisé ET (email similaire OU téléphone proche)
 *
 * Normalisation :
 *  - Email    : lowercase + trim
 *  - Téléphone: chiffres uniquement, garde les 8 derniers (CI = 10 chiffres avec 0)
 *  - Nom     : upper + trim + strip accents
 *
 * Ignore les tickets remboursés/annulés — pas pertinents pour la présence.
 * Ignore les groupes déjà marqués "vérifié pas doublon" (table verifications).
 */
class TicketDuplicateDetector
{
    public function forEvent(int $eventId): Collection
    {
        // 1. Récupère tous les tickets actifs (confirmed + used, pas cancelled/refunded)
        $tickets = EventTicket::query()
            ->where('event_id', $eventId)
            ->whereIn('status', ['confirmed', 'used'])
            ->where(function ($q) {
                $q->whereNull('payment_status')
                  ->orWhereNotIn('payment_status', ['refunded']);
            })
            ->with(['ticketType:id,name'])
            ->get(['id', 'first_name', 'last_name', 'email', 'phone', 'short_code',
                   'order_code', 'status', 'ticket_type_id', 'created_at', 'used_at']);

        // 2. Normalise les champs pour comparaison
        $enriched = $tickets->map(function (EventTicket $t) {
            return [
                'ticket'          => $t,
                'email_norm'      => $this->normalizeEmail($t->email),
                'phone_norm'      => $this->normalizePhone($t->phone),
                'fullname_norm'   => $this->normalizeName($t->first_name, $t->last_name),
            ];
        });

        // 3. Détection CERTAIN : même email OU même téléphone
        $certainGroups = collect();
        $usedTicketIds = collect();

        // Groupes par email
        $byEmail = $enriched->filter(fn ($e) => $e['email_norm'])
            ->groupBy('email_norm')
            ->filter(fn ($group) => $group->count() >= 2);

        foreach ($byEmail as $email => $group) {
            $group = $group->values();
            $ids = $group->pluck('ticket.id')->toArray();
            $certainGroups->push([
                'confidence' => 'certain',
                'criterion'  => 'same_email',
                'match_value'=> $email,
                'match_label'=> 'Email : ' . $email,
                'tickets'    => $group->map(fn ($e) => $this->serializeTicket($e['ticket']))->toArray(),
            ]);
            $usedTicketIds = $usedTicketIds->merge($ids);
        }

        // Groupes par téléphone (en excluant les tickets déjà groupés par email)
        $byPhone = $enriched
            ->reject(fn ($e) => $usedTicketIds->contains($e['ticket']->id))
            ->filter(fn ($e) => $e['phone_norm'])
            ->groupBy('phone_norm')
            ->filter(fn ($group) => $group->count() >= 2);

        foreach ($byPhone as $phone => $group) {
            $group = $group->values();
            $ids = $group->pluck('ticket.id')->toArray();
            $certainGroups->push([
                'confidence' => 'certain',
                'criterion'  => 'same_phone',
                'match_value'=> $phone,
                'match_label'=> 'Téléphone : ' . $this->formatPhoneDisplay($phone),
                'tickets'    => $group->map(fn ($e) => $this->serializeTicket($e['ticket']))->toArray(),
            ]);
            $usedTicketIds = $usedTicketIds->merge($ids);
        }

        // 4. Détection PROBABLE : même nom+prénom + (email OU tel proche)
        $probableGroups = collect();
        $remaining = $enriched->reject(fn ($e) => $usedTicketIds->contains($e['ticket']->id));

        $byName = $remaining
            ->filter(fn ($e) => $e['fullname_norm'])
            ->groupBy('fullname_norm')
            ->filter(fn ($group) => $group->count() >= 2);

        foreach ($byName as $name => $group) {
            $group = $group->values();

            // Vérifie qu'il y a des indices supplémentaires : email similaire OU tel proche
            $isProbable = $this->hasSimilarEmailOrPhone($group);
            if (! $isProbable) {
                // Sans indice supplémentaire, c'est du "possible" (homonymes) — on skip
                continue;
            }

            $probableGroups->push([
                'confidence' => 'probable',
                'criterion'  => 'similar_name_and_contact',
                'match_value'=> $name,
                'match_label'=> 'Nom : ' . $name,
                'tickets'    => $group->map(fn ($e) => $this->serializeTicket($e['ticket']))->toArray(),
            ]);
        }

        // 5. Merge + filtre les groupes déjà vérifiés par un admin
        $allGroups = $certainGroups->merge($probableGroups)->values();
        $allGroups = $this->rejectVerifiedGroups($eventId, $allGroups);

        // 6. Ajoute un hash unique par groupe (pour actions verify)
        return $allGroups->map(function ($group) {
            $ids = collect($group['tickets'])->pluck('id')->sort()->values()->toArray();
            $group['group_hash'] = sha1(implode(',', $ids));
            $group['ticket_ids'] = $ids;
            return $group;
        });
    }

    // ─── Normalisation ─────────────────────────────────────────────

    protected function normalizeEmail(?string $email): ?string
    {
        if (! $email) return null;
        $email = strtolower(trim($email));
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }

    protected function normalizePhone(?string $phone): ?string
    {
        if (! $phone) return null;
        // Garde chiffres uniquement, puis les 8 derniers (numéros CI = 10 avec 0 initial)
        $digits = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($digits) < 6) return null;
        return substr($digits, -8);
    }

    protected function normalizeName(?string $first, ?string $last): ?string
    {
        $full = trim(($first ?? '') . ' ' . ($last ?? ''));
        if (! $full) return null;
        // Retire accents + upper + collapse espaces
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $full);
        $ascii = preg_replace('/[^A-Za-z\s]/', '', $ascii);
        return strtoupper(preg_replace('/\s+/', ' ', trim($ascii)));
    }

    protected function formatPhoneDisplay(string $normalized): string
    {
        // 8 derniers chiffres → format "XX XX XX XX"
        return trim(chunk_split($normalized, 2, ' '));
    }

    // ─── Détection avancée ─────────────────────────────────────────

    /**
     * Un groupe est "probable" si en plus d'un même nom, au moins 2 tickets
     * ont des emails similaires (Levenshtein ≤ 2) OU des téléphones proches
     * (5+ chiffres consécutifs identiques).
     */
    protected function hasSimilarEmailOrPhone(Collection $group): bool
    {
        $group = $group->values();
        for ($i = 0; $i < $group->count(); $i++) {
            for ($j = $i + 1; $j < $group->count(); $j++) {
                $a = $group[$i];
                $b = $group[$j];

                // Emails proches ?
                if ($a['email_norm'] && $b['email_norm']) {
                    $dist = levenshtein($a['email_norm'], $b['email_norm']);
                    if ($dist > 0 && $dist <= 2) return true;
                }

                // Téléphones proches ? (5+ chiffres consécutifs identiques)
                if ($a['phone_norm'] && $b['phone_norm']) {
                    $common = similar_text($a['phone_norm'], $b['phone_norm']);
                    if ($common >= 5) return true;
                }
            }
        }
        return false;
    }

    // ─── Sérialisation ─────────────────────────────────────────────

    protected function serializeTicket(EventTicket $t): array
    {
        return [
            'id'          => $t->id,
            'first_name'  => $t->first_name,
            'last_name'   => $t->last_name,
            'full_name'   => trim($t->first_name . ' ' . $t->last_name),
            'email'       => $t->email,
            'phone'       => $t->phone,
            'short_code'  => $t->short_code,
            'order_code'  => $t->order_code,
            'status'      => $t->status,
            'ticket_type' => $t->ticketType?->name,
            'created_at'  => $t->created_at?->toIso8601String(),
            'used_at'     => $t->used_at?->toIso8601String(),
        ];
    }

    // ─── Groupes vérifiés ─────────────────────────────────────────

    protected function rejectVerifiedGroups(int $eventId, Collection $groups): Collection
    {
        $verifiedHashes = DB::table('event_ticket_duplicate_verifications')
            ->where('event_id', $eventId)
            ->pluck('group_hash')
            ->flip();

        return $groups->reject(function ($group) use ($verifiedHashes) {
            $ids = collect($group['tickets'])->pluck('id')->sort()->values()->toArray();
            $hash = sha1(implode(',', $ids));
            return $verifiedHashes->has($hash);
        })->values();
    }
}
