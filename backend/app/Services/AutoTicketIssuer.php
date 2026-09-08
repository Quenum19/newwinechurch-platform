<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\EventTicketType;
use App\Models\MembershipRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * AutoTicketIssuer — service d'émission automatique d'un ticket pour un
 * event configuré en mode "inscription mono-étape" (modules_enabled.auto_issue_ticket).
 *
 * Point d'entrée unique utilisé par :
 *   - PublicEventRegistrationController::store  (nouveau flux inscription directe)
 *   - PublicRegistrationChoiceController        (ancien flux magic-link, encore actif
 *                                                pour les events sans auto-issue)
 *   - Commande artisan tickets:issue-missing    (rattrapage des préinscrits sans
 *                                                ticket après activation du flag)
 *
 * Comportement :
 *   - Idempotent : renvoie le ticket existant si déjà créé pour ce (event, email/phone)
 *   - Ticket type par défaut : lit modules_enabled.default_ticket_type_id, fallback
 *     sur le premier ticket_type actif de l'event
 *   - Prix : hérite du ticket_type choisi (0 si null)
 *   - Envoi mail : délégué à TicketIssuer (PDF DomPDF + QR + Mailable)
 */
class AutoTicketIssuer
{
    public function __construct(private TicketIssuer $issuer) {}

    /**
     * Émet un ticket pour la préinscription passée, marque `registration_step=ticketed`
     * et envoie le mail. Renvoie ['ticket' => EventTicket, 'sent' => bool, 'reason' => ?string].
     */
    public function issue(Event $event, MembershipRequest $reg): array
    {
        // Idempotence : si un ticket existe déjà pour ce couple (event, email OU phone),
        // on le renvoie sans dupliquer.
        $existing = EventTicket::where('event_id', $event->id)
            ->where(function ($q) use ($reg) {
                if ($reg->email) $q->orWhere('email', $reg->email);
                if ($reg->phone) $q->orWhere('phone', $reg->phone);
            })
            ->first();

        if ($existing) {
            // On s'assure au moins que la préinscription est marquée ticketée
            if ($reg->registration_step !== 'ticketed') {
                $reg->update(['registration_step' => 'ticketed']);
            }
            return ['ticket' => $existing, 'sent' => false, 'reason' => 'already_exists'];
        }

        // Ticket type : préférence admin → fallback premier actif
        $modules = $event->modules_enabled ?? [];
        $preferredId = $modules['default_ticket_type_id'] ?? null;

        $ticketType = null;
        if ($preferredId) {
            $ticketType = EventTicketType::where('event_id', $event->id)
                ->where('id', $preferredId)
                ->first();
        }
        $ticketType ??= EventTicketType::where('event_id', $event->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->first();

        // Aucun ticket type dispo → on refuse plutôt que d'émettre un ticket orphelin.
        if (! $ticketType) {
            Log::warning('AutoTicketIssuer: aucun ticket_type actif', [
                'event_id' => $event->id,
                'reg_id'   => $reg->id,
            ]);
            return ['ticket' => null, 'sent' => false, 'reason' => 'no_ticket_type'];
        }

        // Prefix order code = 2 lettres du titre (ex. FG pour Festi Grill)
        $prefix = strtoupper(
            preg_replace('/[^A-Z]/i', '', substr($event->title, 0, 6))
        );
        $prefix = substr($prefix ?: 'NW', 0, 2);
        $orderCode = $prefix . strtoupper(Str::random(8));

        $shortCode = strtoupper(Str::random(6));
        $accessTok = Str::random(48);
        $qrPayload = json_encode(['e' => $event->id, 't' => $accessTok, 'v' => 1]);

        $ticket = EventTicket::create([
            'event_id'             => $event->id,
            'ticket_type_id'       => $ticketType->id,
            'order_code'           => $orderCode,
            'ticket_number'        => 1,
            'short_code'           => $shortCode,
            'qr_payload'           => $qrPayload,
            'access_token'         => $accessTok,
            'first_name'           => $reg->first_name,
            'last_name'            => $reg->name,
            'email'                => $reg->email,
            'phone'                => $reg->phone,
            'price_fcfa'           => (int) ($ticketType->price_fcfa ?? 0),
            'status'               => 'confirmed',
            'payment_status'       => ($ticketType->price_fcfa ?? 0) > 0 ? 'paid' : 'free',
            'payment_validated_at' => now(),
        ]);

        $reg->update(['registration_step' => 'ticketed']);

        // Envoi mail — non bloquant (log + reason si échoue)
        try {
            $result = $this->issuer->issueAndSend($ticket);
            Log::info('AutoTicketIssuer: ticket émis + envoyé', [
                'event_id'    => $event->id,
                'reg_id'      => $reg->id,
                'ticket_id'   => $ticket->id,
                'type'        => $ticketType->name,
                'email_sent'  => $result['sent'] ?? false,
            ]);
            return [
                'ticket' => $ticket,
                'sent'   => (bool) ($result['sent'] ?? false),
                'reason' => $result['sent'] ? null : ($result['reason'] ?? 'mail_failed'),
            ];
        } catch (\Throwable $e) {
            Log::warning('AutoTicketIssuer: ticket créé mais envoi mail échoué', [
                'ticket_id' => $ticket->id,
                'error'     => $e->getMessage(),
            ]);
            return ['ticket' => $ticket, 'sent' => false, 'reason' => 'mail_exception'];
        }
    }
}
