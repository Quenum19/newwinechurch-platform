<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTicket;
use App\Models\MembershipRequest;
use App\Services\TicketIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Étape 2 du workflow d'inscription — choix d'une "option" (montagne, atelier,
 * table…) via magic-link tokenisé. Lorsqu'un choix est enregistré, un ticket
 * est automatiquement généré et envoyé par email (billetterie gratuite).
 *
 * Endpoints :
 *   GET  /public/registrations/{token}          → renvoie infos préinscription + options
 *   POST /public/registrations/{token}/choose   → enregistre le choix + génère ticket
 *
 * Le choice_workflow définit ce qu'on demande de choisir :
 *   - "mountain" → 7 sphères (interested_mountain)
 *   - "table"    → placement de table (à venir, autre event)
 *   - "atelier"  → atelier thématique (à venir)
 */
class PublicRegistrationChoiceController extends Controller
{
    /** 7 sphères d'influence — mêmes valeurs que PublicBalEnrollmentController. */
    public const MOUNTAINS = [
        'religion'             => 'Religion',
        'media'                => 'Média',
        'gouvernement'         => 'Gouvernement',
        'economie'             => 'Économie',
        'education'            => 'Éducation',
        'famille'              => 'Famille',
        'art_musique_sport'    => 'Art · Musique · Sport',
    ];

    /** GET /public/registrations/{token} */
    public function show(string $token): JsonResponse
    {
        $reg = MembershipRequest::where('registration_token', $token)->firstOrFail();
        $event = $reg->event;
        $modules = $event?->modules_enabled ?? [];
        $workflow = $modules['choice_workflow'] ?? null;

        return response()->json([
            'registration' => [
                'id'         => $reg->id,
                'first_name' => $reg->first_name,
                'name'       => $reg->name,
                'email'      => $reg->email,
                'step'       => $reg->registration_step,
                'mountain'   => $reg->interested_mountain,
                'attended_bal'=> (bool) $reg->attended_bal,
            ],
            'event' => $event ? [
                'id'        => $event->id,
                'slug'      => $event->slug,
                'title'     => $event->title,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'location'  => $event->location,
                // Cover image absolue pour le hero de la page publique
                // /choix (même bandeau que /inscription).
                'cover_image' => $event->cover_image
                    ? \Illuminate\Support\Facades\Storage::disk('public')->url($event->cover_image)
                    : null,
            ] : null,
            'workflow' => $workflow,
            'options'  => $workflow === 'mountain' ? self::MOUNTAINS : [],
        ]);
    }

    /**
     * POST /public/registrations/{token}/choose
     * body : { "choice": "media" }  (dépend du workflow)
     */
    public function choose(Request $request, string $token): JsonResponse
    {
        $reg = MembershipRequest::where('registration_token', $token)->firstOrFail();
        $event = $reg->event;
        if (! $event) {
            return response()->json(['message' => 'Événement introuvable.'], 404);
        }

        $modules = $event->modules_enabled ?? [];
        $workflow = $modules['choice_workflow'] ?? null;
        if (! $workflow) {
            return response()->json(['message' => 'Aucun choix requis pour cet événement.'], 422);
        }

        $data = $request->validate([
            'choice' => ['required', 'string', 'max:60'],
        ]);

        // Validation selon workflow
        if ($workflow === 'mountain') {
            if (! array_key_exists($data['choice'], self::MOUNTAINS)) {
                return response()->json(['message' => 'Choix invalide.'], 422);
            }
            $reg->interested_mountain = $data['choice'];
        }

        $reg->registration_step = 'chose';
        $reg->save();

        // Génération auto du ticket si configuré (ticketing_after_choice)
        $ticket = null;
        if ($modules['ticketing_after_choice'] ?? false) {
            $ticket = $this->generateTicket($event, $reg);
        }

        return response()->json([
            'message'   => 'Choix enregistré.'.($ticket ? ' Ton ticket est en route par email.' : ''),
            'choice'    => $data['choice'],
            'ticket_id' => $ticket?->id,
            'short_code'=> $ticket?->short_code,
        ], 200);
    }

    /**
     * Génère un ticket gratuit lié à l'event pour cette préinscription.
     * Idempotent : si un ticket existe déjà (même email + event), le renvoie.
     */
    private function generateTicket(Event $event, MembershipRequest $reg): EventTicket
    {
        // Idempotence
        $existing = EventTicket::where('event_id', $event->id)
            ->where(function ($q) use ($reg) {
                if ($reg->email) $q->orWhere('email', $reg->email);
                if ($reg->phone) $q->orWhere('phone', $reg->phone);
            })
            ->first();
        if ($existing) return $existing;

        $orderCode  = 'FG' . strtoupper(Str::random(8));
        $shortCode  = strtoupper(Str::random(6));
        $accessTok  = Str::random(48);
        $qrPayload  = json_encode([
            'e' => $event->id,
            't' => $accessTok,
            'v' => 1,
        ]);

        $ticket = EventTicket::create([
            'event_id'       => $event->id,
            'order_code'     => $orderCode,
            'ticket_number'  => 1,
            'short_code'     => $shortCode,
            'qr_payload'     => $qrPayload,
            'access_token'   => $accessTok,
            'first_name'     => $reg->first_name,
            'last_name'      => $reg->name,
            'email'          => $reg->email,
            'phone'          => $reg->phone,
            'price_fcfa'     => 0,
            'status'         => 'confirmed',
            'payment_status' => 'free',
            'payment_validated_at' => now(),
        ]);

        // Marque la préinscription comme ticketée
        $reg->registration_step = 'ticketed';
        $reg->save();

        // Envoi du ticket par email — pipeline standard (PDF DomPDF + QR
        // inline + mail Mailable). Sans ça, le ticket était créé en DB
        // mais le user ne recevait jamais rien.
        try {
            $result = app(TicketIssuer::class)->issueAndSend($ticket);
            Log::info('Ticket généré via magic-link', [
                'event_id'  => $event->id,
                'reg_id'    => $reg->id,
                'ticket_id' => $ticket->id,
                'short'     => $shortCode,
                'email_sent'=> $result['sent'] ?? false,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Ticket créé mais envoi email échoué', [
                'ticket_id' => $ticket->id,
                'error'     => $e->getMessage(),
            ]);
        }

        return $ticket;
    }
}
