<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventTicketResource;
use App\Models\Event;
use App\Models\EventTicket;
use App\Services\QrPayloadService;
use App\Services\RefundService;
use App\Services\TicketIssuer;
use App\Services\TicketPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Endpoints ADMIN de la billetterie.
 *
 *  GET  /api/admin/events/{id}/tickets              → liste paginée + filtres
 *  GET  /api/admin/events/{id}/tickets/stats        → KPIs jour J
 *  POST /api/admin/events/{id}/tickets/{tid}/resend → renvoyer le mail+PDF
 *  POST /api/admin/tickets/scan                     → endpoint scan (rôle controleur)
 *  POST /api/admin/tickets/{id}/unscan              → annuler un scan (erreur agent)
 */
class EventTicketsController extends Controller
{
    public function __construct(
        private QrPayloadService $qrService,
        private TicketIssuer $issuer,
        private TicketPaymentService $payments,
        private RefundService $refunds,
    ) {}

    /**
     * Autorise le user actuel s'il a la permission globale `manage event
     * tickets` OU un grant `manager` scopé à cet event. Sinon 403.
     * Utilisé par toutes les actions qui modifient la billetterie.
     *
     * Sur échec, retourne un JSON explicite avec la raison (au lieu du
     * "Forbidden" opaque de Laravel) pour faciliter le diagnostic.
     */
    private function authorizeManage(Request $request, Event $event): void
    {
        $user = $request->user();
        $hasGlobal = (bool) $user?->can('manage event tickets');
        $hasScoped = $event->userCanManage($user);
        if ($hasGlobal || $hasScoped) return;

        \Log::warning('authorizeManage refusé', [
            'user_id'   => $user?->id,
            'event_id'  => $event->id,
            'roles'     => $user?->getRoleNames()?->toArray(),
            'hasGlobal' => $hasGlobal,
            'hasScoped' => $hasScoped,
        ]);

        abort(response()->json([
            'message' => 'Accès refusé : tu n\'es ni admin ni manager de cet événement.',
            'debug'   => [
                'user_id'         => $user?->id,
                'has_global_perm' => $hasGlobal,
                'has_event_grant' => $hasScoped,
            ],
        ], 403));
    }

    /**
     * Autorise pour LECTURE (liste tickets, stats) : manager global OU grant
     * scoped scanner/scanner_lead/manager. Plus permissif que authorizeManage.
     */
    private function authorizeRead(Request $request, Event $event): void
    {
        $user = $request->user();
        $hasGlobal = (bool) $user?->can('manage event tickets');
        $hasScoped = $event->userCanScan($user);
        if ($hasGlobal || $hasScoped) return;

        \Log::warning('authorizeRead refusé', [
            'user_id'   => $user?->id,
            'event_id'  => $event->id,
            'roles'     => $user?->getRoleNames()?->toArray(),
            'hasGlobal' => $hasGlobal,
            'hasScoped' => $hasScoped,
        ]);

        abort(response()->json([
            'message' => 'Accès refusé : pas de grant billetterie sur cet événement.',
            'debug'   => [
                'user_id'         => $user?->id,
                'has_global_perm' => $hasGlobal,
                'has_event_grant' => $hasScoped,
            ],
        ], 403));
    }

    public function index(Request $request, int $eventId): AnonymousResourceCollection
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeRead($request, $event);

        $perPage = min((int) $request->query('per_page', 50), 200);

        $query = $event->tickets()->with('usedBy:id,name,first_name');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('order_code', $search)
                  ->orWhere('short_code', strtoupper($search))
                  ->orWhere('ticket_number', $search);
            });
        }

        $query->orderByDesc('created_at');

        return EventTicketResource::collection($query->paginate($perPage));
    }

    public function stats(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeRead($request, $event);

        $counts = $event->tickets()
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        $refunded = $event->tickets()
            ->where('payment_status', 'refunded')
            ->count();

        return response()->json([
            'capacity'   => $event->tickets_capacity,
            'confirmed'  => $counts['confirmed'] ?? 0,
            'used'       => $counts['used'] ?? 0,
            'cancelled'  => $counts['cancelled'] ?? 0,
            'refunded'   => $refunded,
            'waitlist'   => $event->waitlist()->where('status', 'waiting')->count(),
            'sold'       => ($counts['confirmed'] ?? 0) + ($counts['used'] ?? 0),
            'remaining'  => $event->tickets_remaining,
            'fill_rate'  => $event->tickets_capacity
                ? round((($counts['confirmed'] ?? 0) + ($counts['used'] ?? 0)) / $event->tickets_capacity * 100, 1)
                : null,
            'scan_rate'  => (($counts['confirmed'] ?? 0) + ($counts['used'] ?? 0)) > 0
                ? round(($counts['used'] ?? 0) / (($counts['confirmed'] ?? 0) + ($counts['used'] ?? 0)) * 100, 1)
                : 0,
        ]);
    }

    public function resend(Request $request, int $eventId, int $ticketId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeManage($request, $event);

        $ticket = EventTicket::where('event_id', $eventId)->findOrFail($ticketId);
        $r = $this->issuer->issueAndSend($ticket);

        return response()->json([
            'message' => $r['sent']
                ? "Mail renvoyé à {$ticket->email}."
                : "Échec envoi : " . ($r['error'] ?? 'erreur inconnue'),
            'sent' => $r['sent'],
        ]);
    }

    /**
     * Endpoint SCAN — utilisé par la PWA /scan côté agent sécurité.
     * Body : { code: "<qr_payload_base64>" } OU { code: "NWC-7H4K" } OU { code: "748962213265674" }
     */
    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'code'     => ['required', 'string', 'max:500'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
        ]);

        // Étape C — Trois voies d'autorisation compatibles :
        //  1. Permission Spatie globale `scan tickets` (contrôleur historique)
        //  2. Grant event_staff scoped `scanner` sur l'event ciblé (nouveaux
        //     scanners internes attribués par manager + invités magic-link)
        //  3. Token Sanctum avec ability `scan:event-{X}` (guest via magic-link)
        //     → sécurité #H2 audit : évite qu'un token guest scanner accède
        //     à d'autres endpoints via ['*'].
        $user            = $request->user();
        $expectedEventId = $request->input('event_id');
        $scopedEvent     = $expectedEventId ? Event::find($expectedEventId) : null;

        $hasGlobalPerm    = (bool) $user?->can('scan tickets');
        $hasScopedGrant   = $scopedEvent && $scopedEvent->userCanScan($user);
        $hasScopedAbility = $expectedEventId
            && $user?->tokenCan('scan:event-' . $expectedEventId);

        abort_unless($hasGlobalPerm || $hasScopedGrant || $hasScopedAbility, 403);

        $code = trim($request->input('code'));

        // 1. Tente le décodage HMAC (QR signé)
        $decoded = $this->qrService->verify($code);
        $ticket = null;

        if ($decoded) {
            $ticket = EventTicket::where('ticket_number', $decoded['ticket_number'])->first();
        } else {
            // 2. Fallback : recherche directe par short_code ou ticket_number
            $upper = strtoupper($code);
            $ticket = EventTicket::where('short_code', $upper)
                ->orWhere('ticket_number', $code)
                ->first();
        }

        if (! $ticket) {
            return response()->json([
                'result'  => 'invalid',
                'message' => 'Code invalide ou inconnu.',
            ], 404);
        }

        // 3. Vérifie que c'est pour le bon event (si l'agent a scopé)
        if ($expectedEventId && $ticket->event_id !== (int) $expectedEventId) {
            return response()->json([
                'result'  => 'wrong_event',
                'message' => "Ce ticket n'est pas pour cet événement.",
                'ticket'  => new EventTicketResource($ticket->load('event')),
            ], 422);
        }

        // Phase 6 — Ticket remboursé : signaler explicitement à l'agent de sécurité.
        if ($ticket->payment_status === 'refunded') {
            return response()->json([
                'result'  => 'refunded',
                'message' => 'Ticket remboursé · ' . ($ticket->refund_reason ?: 'non précisé'),
                'ticket'  => new EventTicketResource($ticket->load('event')),
            ], 422);
        }

        // 4. Check + mark utilisé DANS UNE TRANSACTION avec verrou pessimiste
        //    → empêche 2 agents de scanner en parallèle et de valider 2 entrées
        //    pour le même ticket (race condition #C2 audit sécurité).
        $result = DB::transaction(function () use ($ticket, $request) {
            $locked = EventTicket::lockForUpdate()->find($ticket->id);
            if (! $locked) {
                return ['status' => 404, 'body' => [
                    'result'  => 'invalid',
                    'message' => 'Ticket introuvable.',
                ]];
            }

            if ($locked->status === 'cancelled') {
                return ['status' => 422, 'body' => [
                    'result'  => 'cancelled',
                    'message' => 'Ce ticket a été annulé.',
                    'ticket'  => new EventTicketResource($locked->load('event')),
                ]];
            }

            if ($locked->status === 'used') {
                return ['status' => 409, 'body' => [
                    'result'  => 'already_used',
                    'message' => 'Déjà utilisé · ' . $locked->used_at?->format('H:i')
                              . ($locked->usedBy ? ' · ' . $locked->usedBy->first_name : ''),
                    'ticket'  => new EventTicketResource($locked->load(['event', 'usedBy'])),
                ]];
            }

            // OK → marque utilisé (verrou tenu pendant l'update)
            $locked->update([
                'status'    => 'used',
                'used_at'   => now(),
                'used_by_id'=> $request->user()->id,
                'scan_ip'   => $request->ip(),
            ]);

            return ['status' => 200, 'body' => [
                'result'  => 'ok',
                'message' => '✓ Entrée validée — ' . $locked->full_name,
                'ticket'  => new EventTicketResource($locked->fresh()->load(['event', 'usedBy'])),
            ]];
        });

        return response()->json($result['body'], $result['status']);
    }

    /** Annuler un scan erroné (l'agent a scanné par erreur). */
    public function unscan(Request $request, int $ticketId): JsonResponse
    {
        abort_unless($request->user()?->can('scan tickets'), 403);

        $ticket = EventTicket::findOrFail($ticketId);
        if ($ticket->status !== 'used') {
            return response()->json(['message' => 'Ce ticket n\'est pas marqué utilisé.'], 422);
        }

        $ticket->update([
            'status'   => 'confirmed',
            'used_at'  => null,
            'used_by_id' => null,
            'scan_ip'  => null,
        ]);

        return response()->json(['message' => 'Scan annulé. Le ticket peut être réutilisé.']);
    }

    /** Export Excel des inscrits (réutilise notre style pro NWC). */
    public function export(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeManage($request, $event);

        // Nom fichier : slugifié (accents, espaces, caractères spéciaux nettoyés)
        $safeTitle = \Illuminate\Support\Str::slug($event->title, '-') ?: 'event';
        $filename  = "inscrits-{$safeTitle}-" . now()->format('Y-m-d_His') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\EventTicketsExport($event),
            $filename,
        );
    }

    // ====================================================================
    // === Phase 2 — Validation/refus paiements ===========================
    // ====================================================================

    /**
     * Liste des commandes en attente de paiement (groupées par order_code).
     * Permission : 'validate ticket payments'.
     */
    /**
     * Actions en masse sur une liste de tickets d'un event.
     *  action = 'resend'  : ré-envoie le mail à chaque ticket
     *  action = 'cancel'  : annule (status='cancelled')
     */
    public function bulkAction(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeManage($request, $event);

        $data = $request->validate([
            'action' => ['required', 'in:resend,cancel'],
            'ids'    => ['required', 'array', 'min:1', 'max:500'],
            'ids.*'  => ['integer'],
        ]);

        $tickets = EventTicket::whereIn('id', $data['ids'])
            ->where('event_id', $eventId)
            ->get();

        if ($tickets->isEmpty()) {
            return response()->json(['message' => 'Aucun ticket trouvé.'], 404);
        }

        $ok = 0;
        $failed = 0;

        if ($data['action'] === 'resend') {
            $issuer = app(\App\Services\TicketIssuer::class);
            foreach ($tickets as $t) {
                if ($t->payment_status === 'refunded' || $t->status === 'cancelled') { $failed++; continue; }
                $r = $issuer->issueAndSend($t);
                $r['sent'] ? $ok++ : $failed++;
            }
            return response()->json([
                'message' => "{$ok} mail(s) renvoyé(s), {$failed} échec(s).",
                'ok' => $ok, 'failed' => $failed,
            ]);
        }

        if ($data['action'] === 'cancel') {
            foreach ($tickets as $t) {
                if ($t->status === 'cancelled' || $t->status === 'used') { $failed++; continue; }
                $t->update(['status' => 'cancelled']);
                $ok++;
            }
            return response()->json([
                'message' => "{$ok} ticket(s) annulé(s), {$failed} ignoré(s).",
                'ok' => $ok, 'failed' => $failed,
            ]);
        }

        return response()->json(['message' => 'Action inconnue.'], 422);
    }

    /**
     * Liste la file d'attente d'un event (FIFO, position croissante).
     */
    public function waitlist(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeRead($request, $event);

        $entries = \App\Models\EventTicketWaitlist::where('event_id', $eventId)
            ->where('status', 'waiting')
            ->orderBy('position')
            ->get();

        return response()->json([
            'data' => $entries->map(fn ($w) => [
                'id'         => $w->id,
                'position'   => $w->position,
                'first_name' => $w->first_name,
                'last_name'  => $w->last_name,
                'full_name'  => trim($w->first_name . ' ' . $w->last_name),
                'email'      => $w->email,
                'phone'      => $w->phone,
                'quantity'   => $w->quantity,
                'created_at' => $w->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Convertit une entrée waitlist en ticket(s) gratuit(s) — si une place se libère.
     * Crée 1 ticket par place demandée, émet le mail/PDF/WhatsApp comme inscription standard.
     */
    public function waitlistConvert(Request $request, int $eventId, int $waitlistId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeManage($request, $event);

        $entry = \App\Models\EventTicketWaitlist::where('event_id', $eventId)->findOrFail($waitlistId);

        // Vérifier qu'il y a la capacité
        if ($event->tickets_capacity && ($event->tickets_sold + $entry->quantity) > $event->tickets_capacity) {
            return response()->json([
                'message' => 'Capacité insuffisante. Libère d\'abord ' . $entry->quantity . ' place(s).',
            ], 422);
        }

        $codes  = app(\App\Services\TicketCodeGenerator::class);
        $qr     = app(\App\Services\QrPayloadService::class);
        $issuer = app(\App\Services\TicketIssuer::class);

        $orderCode = $codes->newOrderCode();
        $tickets   = [];

        \Illuminate\Support\Facades\DB::transaction(function () use ($entry, $event, $codes, $qr, $orderCode, &$tickets) {
            for ($i = 0; $i < $entry->quantity; $i++) {
                $tn = $codes->newTicketNumber();
                $tickets[] = \App\Models\EventTicket::create([
                    'event_id'       => $event->id,
                    'order_code'     => $orderCode,
                    'ticket_number'  => $tn,
                    'short_code'     => $codes->newShortCode(),
                    'qr_payload'     => $qr->sign($tn, $event->id),
                    'access_token'   => $codes->newAccessToken(),
                    'first_name'     => $entry->first_name,
                    'last_name'      => $entry->last_name,
                    'email'          => $entry->email,
                    'phone'          => $entry->phone,
                    'status'         => 'confirmed',
                    'payment_status' => 'free',
                ]);
            }
            $entry->update(['status' => 'converted']);
        });

        // Émission mail + PDF
        $sent = 0;
        foreach ($tickets as $t) {
            $r = $issuer->issueAndSend($t);
            if ($r['sent']) $sent++;
        }

        return response()->json([
            'message' => "{$sent}/" . count($tickets) . " ticket(s) émis pour {$entry->first_name} {$entry->last_name}.",
            'order_code' => $orderCode,
        ]);
    }

    /** Supprime une entrée de la file d'attente. */
    public function waitlistRemove(Request $request, int $eventId, int $waitlistId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorizeManage($request, $event);

        $entry = \App\Models\EventTicketWaitlist::where('event_id', $eventId)->findOrFail($waitlistId);
        $entry->delete();

        return response()->json(['message' => 'Entrée supprimée de la file d\'attente.']);
    }

    public function pendingOrders(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        // Manager scopé OU permission validate payments admin.
        $user = $request->user();
        $allowed = (bool) $user?->can('validate ticket payments') || $event->userCanManage($user);
        abort_unless($allowed, 403);

        $orders = EventTicket::where('event_id', $eventId)
            ->where('payment_status', 'pending')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('order_code')
            ->map(function ($tickets) {
                $first = $tickets->first();
                return [
                    'order_code'        => $first->order_code,
                    'first_name'        => $first->first_name,
                    'last_name'         => $first->last_name,
                    'full_name'         => $first->full_name,
                    'email'             => $first->email,
                    'phone'             => $first->phone,
                    'tickets_count'     => $tickets->count(),
                    'total_fcfa'        => $tickets->sum('price_fcfa'),
                    'payment_method'    => $first->payment_method,
                    'payment_reference' => $first->payment_reference,
                    'payment_proof_path'=> $first->payment_proof_path,
                    'payment_expires_at'=> $first->payment_expires_at?->toIso8601String(),
                    'created_at'        => $first->created_at?->toIso8601String(),
                    'has_reference'     => (bool) $first->payment_reference,
                ];
            })
            ->values();

        return response()->json(['data' => $orders]);
    }

    /** Valide le paiement d'une commande → émission tickets. */
    public function validatePayment(Request $request, string $orderCode): JsonResponse
    {
        // Autoriser aussi les managers scopés sur l'event de la commande.
        $firstTicket = EventTicket::where('order_code', $orderCode)->first();
        $event = $firstTicket ? Event::find($firstTicket->event_id) : null;
        $user = $request->user();
        $allowed = (bool) $user?->can('validate ticket payments')
                || ($event && $event->userCanManage($user));
        abort_unless($allowed, 403);

        $result = $this->payments->validateOrder($orderCode, $request->user());
        return response()->json([
            'message'   => "Paiement validé — {$result['sent']}/{$result['validated']} ticket(s) envoyés.",
            'validated' => $result['validated'],
            'sent'      => $result['sent'],
            'errors'    => $result['errors'],
        ]);
    }

    // ====================================================================
    // === Phase 6 — Remboursements / annulations =========================
    // ====================================================================

    /** Rembourse 1 ticket spécifique. */
    public function refundTicket(Request $request, int $ticketId): JsonResponse
    {
        $ticket = EventTicket::findOrFail($ticketId);
        $event = Event::find($ticket->event_id);
        $user = $request->user();
        $allowed = (bool) $user?->can('refund tickets')
                || ($event && $event->userCanManage($user));
        abort_unless($allowed, 403);

        $data = $request->validate([
            'reason'      => ['required', 'string', 'min:3', 'max:255'],
            'method'      => ['nullable', 'string', 'max:30'],
            'reference'   => ['nullable', 'string', 'max:80'],
            'amount_fcfa' => ['nullable', 'integer', 'min:0'],
            'force'       => ['nullable', 'boolean'],
        ]);

        try {
            $result = $this->refunds->refundTicket(
                ticket: $ticket,
                admin: $request->user(),
                reason: $data['reason'],
                details: array_filter([
                    'method'      => $data['method'] ?? null,
                    'reference'   => $data['reference'] ?? null,
                    'amount_fcfa' => $data['amount_fcfa'] ?? null,
                ], fn ($v) => $v !== null),
                force: (bool) ($data['force'] ?? false),
            );
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $result) {
            return response()->json(['message' => 'Ticket déjà inactif (refunded).'], 422);
        }

        return response()->json([
            'message' => 'Ticket remboursé / annulé. Notif envoyée.',
            'ticket'  => new EventTicketResource($result),
        ]);
    }

    /** Rembourse toute une commande (tous les tickets d'un order_code). */
    public function refundOrder(Request $request, string $orderCode): JsonResponse
    {
        $firstTicket = EventTicket::where('order_code', $orderCode)->first();
        $event = $firstTicket ? Event::find($firstTicket->event_id) : null;
        $user = $request->user();
        $allowed = (bool) $user?->can('refund tickets')
                || ($event && $event->userCanManage($user));
        abort_unless($allowed, 403);

        $data = $request->validate([
            'reason'    => ['required', 'string', 'min:3', 'max:255'],
            'method'    => ['nullable', 'string', 'max:30'],
            'reference' => ['nullable', 'string', 'max:80'],
            'force'     => ['nullable', 'boolean'],
        ]);

        $stats = $this->refunds->refundOrder(
            orderCode: $orderCode,
            admin: $request->user(),
            reason: $data['reason'],
            details: array_filter([
                'method'    => $data['method'] ?? null,
                'reference' => $data['reference'] ?? null,
            ], fn ($v) => $v !== null),
            force: (bool) ($data['force'] ?? false),
        );

        if ($stats['count'] === 0) {
            return response()->json(['message' => 'Commande introuvable ou déjà inactive.'], 404);
        }

        return response()->json([
            'message' => "{$stats['count']} ticket(s) traités · {$stats['refunded']} remboursés · {$stats['cancelled']} annulés.",
            'stats'   => $stats,
        ]);
    }

    /** Bulk : annule tout l'event (cas event annulé). */
    public function refundWholeEvent(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $user = $request->user();
        $allowed = (bool) $user?->can('refund tickets')
                || $event->userCanManage($user);
        abort_unless($allowed, 403);

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);
        $totals = $this->refunds->refundEvent(
            event: $event,
            admin: $request->user(),
            reason: $data['reason'],
        );

        return response()->json([
            'message' => "Event annulé : {$totals['orders']} commande(s) · {$totals['tickets']} ticket(s) traités.",
            'totals'  => $totals,
        ]);
    }

    /** Refuse le paiement (raison obligatoire). */
    public function refusePayment(Request $request, string $orderCode): JsonResponse
    {
        $firstTicket = EventTicket::where('order_code', $orderCode)->first();
        $event = $firstTicket ? Event::find($firstTicket->event_id) : null;
        $user = $request->user();
        $allowed = (bool) $user?->can('validate ticket payments')
                || ($event && $event->userCanManage($user));
        abort_unless($allowed, 403);

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $count = $this->payments->refuseOrder($orderCode, $request->user(), $data['reason']);
        if ($count === 0) {
            return response()->json(['message' => 'Aucun ticket pending pour cette commande.'], 404);
        }
        return response()->json([
            'message' => "Paiement refusé — {$count} ticket(s) annulés et inscrit notifié.",
            'count'   => $count,
        ]);
    }
}
