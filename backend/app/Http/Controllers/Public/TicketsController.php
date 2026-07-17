<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\RegisterTicketRequest;
use App\Http\Resources\EventTicketResource;
use App\Mail\OrderConfirmationMail;
use App\Models\DonationMethod;
use App\Models\Event;
use App\Models\EventTicket;
use App\Models\EventTicketType;
use App\Models\EventTicketWaitlist;
use App\Models\User;
use App\Notifications\WhatsApp\InscriptionConfirmationWhatsApp;
use App\Services\NotifyAdmins;
use App\Services\QrPayloadService;
use App\Services\TicketCodeGenerator;
use App\Services\TicketIssuer;
use App\Services\WhatsApp\WhatsAppService;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Endpoints PUBLICS de la billetterie (no auth).
 *
 *  GET  /api/tickets/events                  → liste des events ticketés ouverts
 *  GET  /api/tickets/events/{slug}           → détail + dispo
 *  POST /api/tickets/register                → réservation (1-3 tickets)
 *  GET  /api/tickets/my/{token}              → page "mon ticket"
 *  POST /api/tickets/cancel/{token}          → annulation
 */
class TicketsController extends Controller
{
    use HandlesImageUpload;

    public function __construct(
        private TicketCodeGenerator $codes,
        private TicketIssuer $issuer,
        private QrPayloadService $qrService,
        private WhatsAppService $whatsapp,
    ) {}

    /** Liste des events ticketés en cours (billetterie ouverte). */
    public function events(): AnonymousResourceCollection
    {
        $events = Event::published()
            ->where('ticketing_enabled', true)
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->get();

        return \App\Http\Resources\EventResource::collection($events->map(function ($e) {
            // Injecte le compteur (Resource ne le calcule pas par défaut).
            $e->setAttribute('tickets_sold', $e->tickets_sold);
            return $e;
        }));
    }

    public function show(string $slug): JsonResponse
    {
        $event = Event::published()
            ->with('ticketTypes')
            ->where('ticketing_enabled', true)
            ->where('slug', $slug)
            ->firstOrFail();

        // Types de tickets exposés (Phase 2) — incluent sold/remaining/is_available.
        $types = $event->ticketTypes->where('is_active', true)->values()->map(fn ($t) => [
            'id'            => $t->id,
            'name'          => $t->name,
            'slug'          => $t->slug,
            'description'   => $t->description,
            'price_fcfa'    => $t->price_fcfa,
            'capacity'      => $t->capacity,
            'sold'          => $t->sold,
            'remaining'     => $t->remaining,
            'is_available'  => $t->is_available,
            'max_per_order' => $t->max_per_order,
            'color_hex'     => $t->color_hex,
            'sort_order'    => $t->sort_order,
        ]);

        // Forme consommée par le front : { event, meta, ticket_types }.
        return response()->json([
            'event' => (new \App\Http\Resources\EventResource($event))->toArray(request()),
            'meta' => [
                'sold'         => $event->tickets_sold,
                'remaining'    => $event->tickets_remaining,
                'capacity'     => $event->tickets_capacity,
                'is_open'      => $event->ticketing_is_open,
                'closes_at'    => $event->tickets_closes_at?->toIso8601String(),
                'per_email_max'=> $event->tickets_per_email_max,
                'has_paid_types' => $types->where('price_fcfa', '>', 0)->isNotEmpty(),
            ],
            'ticket_types' => $types,
        ]);
    }

    public function register(RegisterTicketRequest $request): JsonResponse
    {
        // Rate-limit anti-bot : 3 tentatives / 10 min par IP.
        $key = 'tickets:register:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return response()->json([
                'message' => 'Trop de tentatives. Réessaie dans quelques minutes.',
            ], 429);
        }
        RateLimiter::hit($key, 600);

        $event = Event::with('ticketTypes')->findOrFail($request->validated('event_id'));

        // === Vérifs métier event ===
        if (! $event->ticketing_enabled) {
            return response()->json(['message' => 'La billetterie de cet événement est désactivée.'], 422);
        }
        if ($event->tickets_closes_at && now()->gt($event->tickets_closes_at)) {
            return response()->json(['message' => 'La billetterie est fermée.'], 422);
        }
        if ($event->starts_at && now()->gt($event->starts_at)) {
            return response()->json(['message' => 'Cet événement est déjà passé.'], 422);
        }

        // === Phase 2 : panier multi-type vs Phase 1 : quantité simple ===
        $items = $this->resolveCartItems($event, $request);
        if (isset($items['error'])) {
            return response()->json(['message' => $items['error']], 422);
        }
        $totalQuantity = array_sum(array_column($items, 'quantity'));
        $totalFcfa     = array_sum(array_map(fn ($i) => $i['quantity'] * $i['price_fcfa'], $items));
        $isPaid        = $totalFcfa > 0;

        if ($totalQuantity > $event->tickets_per_email_max) {
            return response()->json([
                'message' => "Maximum {$event->tickets_per_email_max} tickets par réservation.",
            ], 422);
        }

        // === Anti-doublon par email ===
        $email = strtolower(trim($request->validated('email')));
        $alreadyOwned = EventTicket::where('event_id', $event->id)
            ->where('email', $email)
            ->whereIn('status', ['confirmed', 'used'])
            ->whereIn('payment_status', ['free', 'pending', 'paid'])
            ->count();

        if (($alreadyOwned + $totalQuantity) > $event->tickets_per_email_max) {
            return response()->json([
                'message' => "Tu as déjà {$alreadyOwned} ticket(s) avec cet email. Maximum {$event->tickets_per_email_max} au total.",
            ], 422);
        }

        // === Selfie ===
        $selfiePath = $this->handleSelfie($event, $request);
        if ($selfiePath === false) {
            return response()->json(['message' => "Un selfie est obligatoire pour cet événement."], 422);
        }

        // === Capacité globale → waitlist si pleine ===
        if ($event->tickets_capacity && ($event->tickets_sold + $totalQuantity) > $event->tickets_capacity) {
            if (! $event->allow_waitlist) {
                return response()->json(['message' => 'Désolé, l\'événement est complet.'], 409);
            }
            return $this->addToWaitlist($event, $request->validated(), $email);
        }

        // === Vérif capacité par type (Phase 2) ===
        foreach ($items as $item) {
            if ($item['type'] && $item['type']->capacity) {
                $remaining = $item['type']->remaining;
                if ($remaining !== null && $item['quantity'] > $remaining) {
                    return response()->json([
                        'message' => "Plus que {$remaining} place(s) en {$item['type']->name}.",
                    ], 409);
                }
            }
        }

        // === Création tickets (1 ligne par personne) ===
        $orderCode    = $this->codes->newOrderCode();
        $guests       = $request->validated('guests') ?? [];
        $primaryName  = ['first_name' => $request->validated('first_name'), 'last_name' => $request->validated('last_name')];
        $linkedUserId = User::where('email', $email)->value('id');

        // Statut paiement : 'free' (Phase 1 ou items 0F) vs 'pending' (Phase 2 payant)
        $paymentStatus = $isPaid ? 'pending' : 'free';
        $expiresAt     = $isPaid ? now()->addHours(24) : null;

        // Phase 3 — opt-in WhatsApp (true par défaut côté front).
        $whatsappOptIn = (bool) ($request->validated('whatsapp_opt_in') ?? true);

        $tickets = DB::transaction(function () use (
            $event, $items, $primaryName, $guests, $email, $request,
            $orderCode, $selfiePath, $linkedUserId, $paymentStatus, $expiresAt, $whatsappOptIn
        ) {
            $created = [];
            $holderIdx = 0;
            // Holders : 1 = inscrit principal, suivants = guests (sinon copie inscrit).
            $holderQueue = array_merge([$primaryName], $guests);

            foreach ($items as $item) {
                for ($i = 0; $i < $item['quantity']; $i++) {
                    $holder = $holderQueue[$holderIdx] ?? $primaryName;
                    $holderIdx++;

                    $ticketNumber = $this->codes->newTicketNumber();
                    $shortCode    = $this->codes->newShortCode();
                    $accessToken  = $this->codes->newAccessToken();
                    $qrPayload    = $this->qrService->sign($ticketNumber, $event->id);

                    $created[] = EventTicket::create([
                        'event_id'           => $event->id,
                        'ticket_type_id'     => $item['type']?->id,
                        'order_code'         => $orderCode,
                        'ticket_number'      => $ticketNumber,
                        'short_code'         => $shortCode,
                        'qr_payload'         => $qrPayload,
                        'access_token'       => $accessToken,
                        'first_name'         => $holder['first_name'],
                        'last_name'          => $holder['last_name'],
                        'email'              => $email,
                        'phone'              => $request->validated('phone'),
                        'selfie_path'        => $selfiePath,
                        'price_fcfa'         => $item['price_fcfa'],
                        'status'             => 'confirmed',
                        'payment_status'     => $paymentStatus,
                        'payment_expires_at' => $expiresAt,
                        'whatsapp_opt_in'    => $whatsappOptIn,
                        'linked_user_id'     => $linkedUserId,
                    ]);
                }
            }
            return $created;
        });

        // Notif in-app aux managers de l'event + admins globaux — 1 par commande.
        $firstTicket = $tickets[0];
        NotifyAdmins::eventManagers($event, [
            'type'       => 'new_ticket_registered',
            'title'      => "Nouvelle inscription — {$event->title}",
            'body'       => count($tickets) > 1
                ? trim($firstTicket->first_name.' '.$firstTicket->last_name) . " a pris " . count($tickets) . ' tickets.'
                : trim($firstTicket->first_name.' '.$firstTicket->last_name) . " vient de s'inscrire.",
            'event_id'   => $event->id,
            'order_code' => $orderCode,
            'quantity'   => count($tickets),
            'url'        => '/mission/evenement/' . $event->id,
        ]);

        // === Branche Phase 1 : gratuit → émission immédiate ===
        if (! $isPaid) {
            $sent = 0; $errs = [];
            foreach ($tickets as $t) {
                $r = $this->issuer->issueAndSend($t);
                if ($r['sent']) $sent++; else $errs[] = $r['error'] ?? 'err';
            }
            // Phase 3 — WhatsApp confirmation (1 seul msg sur le 1er ticket).
            (new InscriptionConfirmationWhatsApp($tickets[0]))->send($this->whatsapp);

            $total = count($tickets);
            return response()->json([
                'message'       => "{$sent}/{$total} ticket(s) envoyé(s) à {$email}.",
                'paid'          => false,
                'order_code'    => $orderCode,
                'tickets_count' => $total,
                'access_token'  => $tickets[0]->access_token ?? null,
                'tickets'       => EventTicketResource::collection(collect($tickets)),
                'email_errors'  => $errs,
            ], 201);
        }

        // === Branche Phase 2/7 : payant ===
        // Phase 7 : si event en mode 'cinetpay', les instructions Mobile Money
        // n'ont pas de sens (le paiement passera par l'API). On envoie quand même
        // un mail récap mais sans la liste des numéros.
        $isCinetPay = $event->payment_mode === 'cinetpay';
        $methods = $isCinetPay ? [] : DonationMethod::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['code', 'name', 'account_number', 'recipient_name'])
            ->toArray();

        $orderTrackingUrl = rtrim(config('app.frontend_url', config('app.url')), '/')
                          . '/ma-commande/' . $orderCode;

        try {
            Mail::to($email)->send(new OrderConfirmationMail(
                tickets: collect($tickets)->each->load('event', 'ticketType'),
                paymentMethods: $methods,
                totalFcfa: $totalFcfa,
                orderTrackingUrl: $orderTrackingUrl,
            ));
        } catch (\Throwable $e) {
            \Log::warning('OrderConfirmation mail failed', ['err' => $e->getMessage()]);
        }

        // Phase 3 — WhatsApp confirmation Pending (instructions paiement résumées).
        (new InscriptionConfirmationWhatsApp(
            ticket: $tickets[0],
            totalFcfa: $totalFcfa,
            orderTrackingUrl: $orderTrackingUrl,
        ))->send($this->whatsapp);

        return response()->json([
            'paid'            => true,
            'payment_mode'    => $event->payment_mode,
            'order_code'      => $orderCode,
            'tickets_count'   => count($tickets),
            'total_fcfa'      => $totalFcfa,
            'payment_methods' => $methods,
            'expires_at'      => $expiresAt?->toIso8601String(),
            'tracking_url'    => $orderTrackingUrl,
            'message'         => "Commande enregistrée. Envoie {$totalFcfa} FCFA via Mobile Money en mentionnant la référence {$orderCode}.",
        ], 201);
    }

    /**
     * Normalise le panier en items : [{type, quantity, price_fcfa}].
     * Supporte Phase 1 (quantity simple, type=null) ET Phase 2 (items[]).
     */
    private function resolveCartItems(Event $event, RegisterTicketRequest $request): array
    {
        $items = $request->validated('items');
        $quantity = $request->validated('quantity');

        // Cas Phase 2 : items multi-type fournis
        if (! empty($items)) {
            $resolved = [];
            foreach ($items as $i) {
                $type = $event->ticketTypes->firstWhere('id', $i['ticket_type_id']);
                if (! $type) return ['error' => 'Type de ticket invalide.'];
                if (! $type->is_active) return ['error' => "Le type \"{$type->name}\" n'est plus disponible."];
                $resolved[] = [
                    'type'       => $type,
                    'quantity'   => $i['quantity'],
                    'price_fcfa' => $type->price_fcfa,
                ];
            }
            return $resolved;
        }

        // Cas Phase 1 : pas d'items mais quantity simple
        if (! $quantity) return ['error' => 'Précise la quantité ou les types de tickets.'];

        // Si l'event a des types mais quantity simple → erreur (sauf si un seul type gratuit)
        $activeTypes = $event->ticketTypes->where('is_active', true);
        if ($activeTypes->isNotEmpty()) {
            // S'il existe un type gratuit unique → on l'utilise
            $freeTypes = $activeTypes->where('price_fcfa', 0);
            if ($freeTypes->count() === 1 && $activeTypes->count() === 1) {
                $type = $freeTypes->first();
                return [['type' => $type, 'quantity' => $quantity, 'price_fcfa' => 0]];
            }
            return ['error' => 'Cet événement a plusieurs types — sélectionne tes places.'];
        }

        // Phase 1 pur : pas de types → ticket gratuit unique
        return [['type' => null, 'quantity' => $quantity, 'price_fcfa' => 0]];
    }

    /** Selfie : false = required mais absent ; null = pas requis/pas fourni ; string = path stocké. */
    private function handleSelfie(Event $event, RegisterTicketRequest $request): false|string|null
    {
        if ($event->require_selfie && ! $request->hasFile('selfie')) return false;
        if (! $request->hasFile('selfie')) return null;

        $disk = \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'));
        $file = $request->file('selfie');
        $path = 'tickets/selfies/' . bin2hex(random_bytes(8)) . '.webp';
        try {
            $manager = new \Intervention\Image\ImageManager(new \Intervention\Image\Drivers\Gd\Driver());
            $img = $manager->read($file->getRealPath())->scaleDown(600, 600);
            $disk->put($path, (string) $img->toWebp(85)->toString(), ['visibility' => 'public']);
        } catch (\Throwable) {
            $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);
        }
        return $path;
    }

    private function addToWaitlist(Event $event, array $data, string $email): JsonResponse
    {
        $existing = EventTicketWaitlist::where('event_id', $event->id)
            ->where('email', $email)->first();
        if ($existing) {
            return response()->json([
                'waitlist'   => true,
                'position'   => $existing->position,
                'message'    => "Tu es déjà en liste d'attente (position {$existing->position}).",
            ]);
        }

        $position = (EventTicketWaitlist::where('event_id', $event->id)
                        ->max('position') ?? 0) + 1;

        EventTicketWaitlist::create([
            'event_id'   => $event->id,
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'email'      => $email,
            'phone'      => $data['phone'] ?? null,
            'quantity'   => $data['quantity'],
            'position'   => $position,
            'status'     => 'waiting',
        ]);

        return response()->json([
            'waitlist'  => true,
            'position'  => $position,
            'message'   => "L'événement est complet — tu es en liste d'attente position {$position}. On te prévient si une place se libère.",
        ], 202);
    }

    /**
     * Phase 2 — Suivi d'une commande payante (avant validation paiement).
     * GET /api/tickets/order/{orderCode}
     */
    public function showOrder(string $orderCode): JsonResponse
    {
        $tickets = EventTicket::with('event', 'ticketType')
            ->where('order_code', $orderCode)
            ->orderBy('id')
            ->get();

        if ($tickets->isEmpty()) {
            return response()->json(['message' => 'Commande introuvable.'], 404);
        }

        $first = $tickets->first();
        $total = $tickets->sum('price_fcfa');

        // Map status global : si TOUS paid → paid ; si TOUS expired/refused → respectif ; sinon pending
        $statuses = $tickets->pluck('payment_status')->unique()->values();
        $orderStatus = $statuses->count() === 1 ? $statuses->first() : 'mixed';

        return response()->json([
            'order_code'      => $orderCode,
            'order_status'    => $orderStatus,
            'event'           => $first->event ? [
                'id'        => $first->event->id,
                'title'     => $first->event->title,
                'slug'      => $first->event->slug,
                'starts_at' => $first->event->starts_at?->toIso8601String(),
                'location'  => $first->event->location,
                'support_phone' => $first->event->support_phone,
                'payment_mode'  => $first->event->payment_mode,
            ] : null,
            'first_name'      => $first->first_name,
            'last_name'       => $first->last_name,
            'email'           => $first->email,
            'phone'           => $first->phone,
            'total_fcfa'      => $total,
            'tickets'         => $tickets->map(fn ($t) => [
                'id'           => $t->id,
                'short_code'   => $t->short_code,
                'full_name'    => $t->full_name,
                'price_fcfa'   => $t->price_fcfa,
                'type_name'    => $t->ticketType?->name,
                'status'       => $t->status,
                'payment_status' => $t->payment_status,
                'access_token' => $t->payment_status === 'paid' || $t->payment_status === 'free' ? $t->access_token : null,
            ]),
            'payment_method'    => $first->payment_method,
            'payment_reference' => $first->payment_reference,
            'payment_expires_at'=> $first->payment_expires_at?->toIso8601String(),
            'payment_refusal_reason' => $first->payment_refusal_reason,
            'payment_methods'   => DonationMethod::where('is_active', true)
                ->orderBy('sort_order')->get(['code', 'name', 'account_number', 'recipient_name'])->toArray(),
        ]);
    }

    /**
     * Phase 2 — L'inscrit soumet sa référence de transaction Mobile Money.
     * POST /api/tickets/order/{orderCode}/submit-payment
     */
    public function submitPayment(string $orderCode, Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_method'    => ['required', 'string', 'max:30'],
            'payment_reference' => ['required', 'string', 'min:4', 'max:80'],
            'payment_proof'     => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $tickets = EventTicket::where('order_code', $orderCode)
            ->where('payment_status', 'pending')
            ->get();

        if ($tickets->isEmpty()) {
            return response()->json(['message' => 'Commande introuvable ou déjà traitée.'], 404);
        }

        // Upload preuve si fournie
        $proofPath = null;
        if ($request->hasFile('payment_proof')) {
            $disk = \Illuminate\Support\Facades\Storage::disk(config('filesystems.default'));
            $proofPath = 'tickets/proofs/' . bin2hex(random_bytes(8)) . '.' . $request->file('payment_proof')->extension();
            $disk->put($proofPath, file_get_contents($request->file('payment_proof')->getRealPath()), ['visibility' => 'public']);
        }

        foreach ($tickets as $t) {
            $t->update([
                'payment_method'     => $data['payment_method'],
                'payment_reference'  => $data['payment_reference'],
                'payment_proof_path' => $proofPath ?? $t->payment_proof_path,
            ]);
        }

        return response()->json([
            'message' => 'Référence enregistrée. Tu seras notifié par mail après validation.',
        ]);
    }

    public function myTicket(string $token): JsonResponse
    {
        $ticket = EventTicket::with('event')
            ->where('access_token', $token)
            ->firstOrFail();

        $payload = (new EventTicketResource($ticket))->toArray(request());
        // On enrichit avec qr_payload (visible UNIQUEMENT sur cette page perso) +
        // forme attendue par le front : { ticket: {...} }.
        $payload['qr_payload'] = $ticket->qr_payload;
        $payload['full_name']  = $ticket->full_name;

        return response()->json(['ticket' => $payload]);
    }

    /**
     * Endpoint image du QR code, accessible uniquement avec l'access_token.
     * Permet à <img src="/api/tickets/qr/{token}"/> de fonctionner directement.
     *
     * Tente PNG (imagick) d'abord — fallback SVG (toujours dispo, pure PHP).
     * Le navigateur affiche les 2 formats nativement.
     */
    public function qrImage(string $token)
    {
        $ticket = EventTicket::where('access_token', $token)->firstOrFail();

        try {
            $png = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')
                ->size(500)->margin(1)->errorCorrection('M')
                ->generate($ticket->qr_payload);

            return response((string) $png, 200, [
                'Content-Type'  => 'image/png',
                'Cache-Control' => 'private, max-age=600',
            ]);
        } catch (\Throwable) {
            $svg = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
                ->size(500)->margin(1)->errorCorrection('M')
                ->generate($ticket->qr_payload);

            return response((string) $svg, 200, [
                'Content-Type'  => 'image/svg+xml',
                'Cache-Control' => 'private, max-age=600',
            ]);
        }
    }

    public function cancel(string $token): JsonResponse
    {
        $ticket = EventTicket::where('access_token', $token)->firstOrFail();

        if ($ticket->status === 'used') {
            return response()->json(['message' => 'Ce ticket a déjà été utilisé, impossible d\'annuler.'], 422);
        }
        if ($ticket->status === 'cancelled') {
            return response()->json(['message' => 'Ce ticket est déjà annulé.']);
        }

        $ticket->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Ta réservation a été annulée. Merci d\'avoir libéré la place.',
        ]);
    }
}
