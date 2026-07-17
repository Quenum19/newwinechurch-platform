<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Phase 4 — Analytics billetterie (trans-events + détail par event).
 *
 *  GET /api/admin/ticketing/overview              → KPIs globaux + top events
 *  GET /api/admin/ticketing/revenue-monthly       → revenus 12 derniers mois
 *  GET /api/admin/ticketing/payment-methods       → donut méthodes
 *  GET /api/admin/ticketing/types-breakdown       → donut types (trans-events)
 *  GET /api/admin/ticketing/pending-orders        → toutes les commandes pending (cross-event)
 *  GET /api/admin/events/{id}/analytics           → détail par event (timeseries, donut, funnel)
 *
 * Permission : 'manage event tickets'.
 */
class TicketingAnalyticsController extends Controller
{
    /**
     * Page principale /admin/billetterie : KPIs + tableau top events.
     */
    public function overview(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage event tickets'), 403);

        // === KPIs globaux (tous events ticketés confondus) ===
        $eventsCount     = Event::where('ticketing_enabled', true)->count();
        $upcomingCount   = Event::where('ticketing_enabled', true)
                                ->where('starts_at', '>=', now())->count();

        // On compte les tickets en distinguant les statuts paiement.
        $stats = EventTicket::selectRaw('
            COUNT(*) as total_tickets,
            SUM(CASE WHEN payment_status IN (\'free\',\'paid\') THEN 1 ELSE 0 END) as issued_tickets,
            SUM(CASE WHEN payment_status = \'pending\' THEN 1 ELSE 0 END) as pending_tickets,
            SUM(CASE WHEN payment_status = \'paid\' THEN price_fcfa ELSE 0 END) as paid_revenue,
            SUM(CASE WHEN payment_status = \'pending\' THEN price_fcfa ELSE 0 END) as pending_revenue,
            SUM(CASE WHEN payment_status = \'refunded\' THEN refund_amount_fcfa ELSE 0 END) as refunded_revenue,
            SUM(CASE WHEN payment_status = \'refunded\' THEN 1 ELSE 0 END) as refunded_tickets,
            SUM(CASE WHEN status = \'used\' THEN 1 ELSE 0 END) as scanned,
            SUM(CASE WHEN whatsapp_opt_in = 1 THEN 1 ELSE 0 END) as wa_opt_in_count,
            SUM(CASE WHEN whatsapp_sent_at IS NOT NULL THEN 1 ELSE 0 END) as wa_sent_count
        ')->first();

        // === Top events (revenu paid décroissant, top 10) ===
        $topEvents = Event::where('ticketing_enabled', true)
            ->with(['tickets' => fn ($q) => $q->select('id', 'event_id', 'status', 'payment_status', 'price_fcfa')])
            ->get()
            ->map(function (Event $event) {
                $tickets = $event->tickets;
                $sold    = $tickets->whereIn('payment_status', ['free', 'paid'])
                                   ->whereIn('status', ['confirmed', 'used'])->count();
                $revenue = $tickets->where('payment_status', 'paid')->sum('price_fcfa');
                $fillRate = $event->tickets_capacity
                    ? round($sold / $event->tickets_capacity * 100, 1)
                    : null;
                return [
                    'id'        => $event->id,
                    'title'     => $event->title,
                    'slug'      => $event->slug,
                    'starts_at' => $event->starts_at?->toIso8601String(),
                    'capacity'  => $event->tickets_capacity,
                    'sold'      => $sold,
                    'revenue'   => $revenue,
                    'fill_rate' => $fillRate,
                    'is_past'   => $event->starts_at && $event->starts_at->isPast(),
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        // === Taux conversion : pending → paid sur 30 derniers jours ===
        $thirtyDaysAgo = now()->subDays(30);
        $createdInWindow = EventTicket::where('created_at', '>=', $thirtyDaysAgo)
            ->whereIn('payment_status', ['pending', 'paid', 'refused', 'expired'])
            ->count();
        $paidInWindow = EventTicket::where('created_at', '>=', $thirtyDaysAgo)
            ->where('payment_status', 'paid')->count();
        $conversionRate = $createdInWindow > 0
            ? round($paidInWindow / $createdInWindow * 100, 1) : null;

        // === Taux opt-in WhatsApp ===
        $waOptInRate = ($stats->total_tickets ?? 0) > 0
            ? round(($stats->wa_opt_in_count ?? 0) / $stats->total_tickets * 100, 1) : 0;

        return response()->json([
            'events_count'      => $eventsCount,
            'upcoming_count'    => $upcomingCount,
            'total_tickets'     => (int) ($stats->total_tickets ?? 0),
            'issued_tickets'    => (int) ($stats->issued_tickets ?? 0),
            'pending_tickets'   => (int) ($stats->pending_tickets ?? 0),
            'scanned'           => (int) ($stats->scanned ?? 0),
            'paid_revenue'      => (int) ($stats->paid_revenue ?? 0),
            'pending_revenue'   => (int) ($stats->pending_revenue ?? 0),
            'refunded_revenue'  => (int) ($stats->refunded_revenue ?? 0),
            'refunded_count'    => (int) ($stats->refunded_tickets ?? 0),
            'net_revenue'       => (int) ($stats->paid_revenue ?? 0) - (int) ($stats->refunded_revenue ?? 0),
            'conversion_rate'   => $conversionRate, // %
            'wa_opt_in_rate'    => $waOptInRate,    // %
            'wa_sent_count'     => (int) ($stats->wa_sent_count ?? 0),
            'top_events'        => $topEvents->take(10),
        ]);
    }

    /**
     * Revenus mensuels sur les 12 derniers mois (line chart).
     */
    public function revenueMonthly(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage event tickets'), 403);

        $start = now()->subMonths(11)->startOfMonth();

        $rows = EventTicket::selectRaw('
            DATE_FORMAT(payment_validated_at, "%Y-%m") as month,
            SUM(price_fcfa) as revenue,
            COUNT(*) as tickets_count
        ')
        ->where('payment_status', 'paid')
        ->whereNotNull('payment_validated_at')
        ->where('payment_validated_at', '>=', $start)
        ->groupBy('month')
        ->orderBy('month')
        ->get()
        ->keyBy('month');

        // Remplit les 12 mois (zéros pour les mois sans paiement).
        $series = [];
        for ($i = 0; $i < 12; $i++) {
            $monthStart = $start->copy()->addMonths($i);
            $key = $monthStart->format('Y-m');
            $series[] = [
                'month'         => $key,
                'label'         => $monthStart->locale('fr')->isoFormat('MMM YY'),
                'revenue'       => (int) ($rows[$key]->revenue ?? 0),
                'tickets_count' => (int) ($rows[$key]->tickets_count ?? 0),
            ];
        }

        return response()->json(['data' => $series]);
    }

    /**
     * Répartition par méthode de paiement (Orange, Wave, MTN, Moov).
     */
    public function paymentMethods(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage event tickets'), 403);

        $rows = EventTicket::selectRaw('
            payment_method,
            COUNT(*) as count,
            SUM(price_fcfa) as revenue
        ')
        ->where('payment_status', 'paid')
        ->whereNotNull('payment_method')
        ->groupBy('payment_method')
        ->get()
        ->map(fn ($r) => [
            'method'  => $r->payment_method,
            'label'   => $this->methodLabel($r->payment_method),
            'count'   => (int) $r->count,
            'revenue' => (int) $r->revenue,
        ])
        ->values();

        return response()->json(['data' => $rows]);
    }

    /**
     * Répartition par type de ticket (trans-events).
     */
    public function typesBreakdown(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage event tickets'), 403);

        // On groupe par nom de type (cohérent entre events qui ont les mêmes noms).
        $rows = DB::table('event_tickets as et')
            ->leftJoin('event_ticket_types as t', 'et.ticket_type_id', '=', 't.id')
            ->whereIn('et.status', ['confirmed', 'used'])
            ->whereIn('et.payment_status', ['free', 'paid', 'pending'])
            ->selectRaw('
                COALESCE(t.name, "Sans type") as type_name,
                COUNT(et.id) as count,
                SUM(et.price_fcfa) as revenue,
                t.color_hex as color
            ')
            ->groupBy('type_name', 'color')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($r) => [
                'type'    => $r->type_name,
                'count'   => (int) $r->count,
                'revenue' => (int) $r->revenue,
                'color'   => $r->color,
            ]),
        ]);
    }

    /**
     * Toutes les commandes pending (cross-event) — utile à l'admin-site qui valide.
     */
    public function allPendingOrders(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('validate ticket payments'), 403);

        $orders = EventTicket::with('event:id,title,slug')
            ->where('payment_status', 'pending')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('order_code')
            ->map(function ($tickets) {
                $first = $tickets->first();
                return [
                    'order_code'        => $first->order_code,
                    'full_name'         => $first->full_name,
                    'email'             => $first->email,
                    'phone'             => $first->phone,
                    'tickets_count'     => $tickets->count(),
                    'total_fcfa'        => $tickets->sum('price_fcfa'),
                    'payment_method'    => $first->payment_method,
                    'payment_reference' => $first->payment_reference,
                    'payment_expires_at'=> $first->payment_expires_at?->toIso8601String(),
                    'has_reference'     => (bool) $first->payment_reference,
                    'created_at'        => $first->created_at?->toIso8601String(),
                    'event'             => $first->event ? [
                        'id'    => $first->event->id,
                        'title' => $first->event->title,
                        'slug'  => $first->event->slug,
                    ] : null,
                ];
            })
            ->values();

        return response()->json(['data' => $orders]);
    }

    /**
     * Détail analytics d'un event spécifique (timeseries + donut + funnel).
     */
    public function eventDetail(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        // Étape F — Autoriser aussi les managers scopés (event_staff.grant=manager).
        $user = $request->user();
        $allowed = (bool) $user?->can('manage event tickets')
                || $event->userCanManage($user);
        abort_unless($allowed, 403);

        // === Ventes cumulées dans le temps (sur les 30 derniers jours pour lisibilité) ===
        $cutoff = $event->created_at?->copy()?->startOfDay() ?? now()->subDays(30)->startOfDay();
        $end    = ($event->starts_at && $event->starts_at->isFuture()) ? $event->starts_at : now();
        $timeline = $event->tickets()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count, SUM(price_fcfa) as revenue')
            ->whereIn('payment_status', ['free', 'paid', 'pending'])
            ->whereBetween('created_at', [$cutoff, $end])
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $cumulative = 0; $cumulativeRevenue = 0;
        $series = $timeline->map(function ($r) use (&$cumulative, &$cumulativeRevenue) {
            $cumulative        += $r->count;
            $cumulativeRevenue += $r->revenue;
            return [
                'day'                => $r->day,
                'daily_count'        => (int) $r->count,
                'daily_revenue'      => (int) $r->revenue,
                'cumulative_count'   => $cumulative,
                'cumulative_revenue' => $cumulativeRevenue,
            ];
        });

        // === Donut types ===
        $typesBreakdown = $event->tickets()
            ->leftJoin('event_ticket_types as t', 'event_tickets.ticket_type_id', '=', 't.id')
            ->whereIn('event_tickets.status', ['confirmed', 'used'])
            ->whereIn('event_tickets.payment_status', ['free', 'paid', 'pending'])
            ->selectRaw('COALESCE(t.name, "Sans type") as type, COUNT(*) as count, SUM(event_tickets.price_fcfa) as revenue, t.color_hex as color')
            ->groupBy('type', 'color')
            ->get()
            ->map(fn ($r) => [
                'type'    => $r->type,
                'count'   => (int) $r->count,
                'revenue' => (int) $r->revenue,
                'color'   => $r->color,
            ]);

        // === Donut méthodes paiement (uniquement pour cet event) ===
        $methodsBreakdown = $event->tickets()
            ->where('payment_status', 'paid')
            ->whereNotNull('payment_method')
            ->selectRaw('payment_method, COUNT(*) as count, SUM(price_fcfa) as revenue')
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($r) => [
                'method'  => $r->payment_method,
                'label'   => $this->methodLabel($r->payment_method),
                'count'   => (int) $r->count,
                'revenue' => (int) $r->revenue,
            ]);

        // === Funnel conversion ===
        $stats = $event->tickets()->selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN payment_status IN (\'free\',\'pending\',\'paid\') THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN payment_status IN (\'free\',\'paid\') THEN 1 ELSE 0 END) as issued,
            SUM(CASE WHEN status = \'used\' THEN 1 ELSE 0 END) as scanned,
            SUM(CASE WHEN payment_status = \'expired\' THEN 1 ELSE 0 END) as expired,
            SUM(CASE WHEN payment_status = \'refused\' THEN 1 ELSE 0 END) as refused
        ')->first();

        $funnel = [
            ['step' => 'Inscrits',  'count' => (int) $stats->total,    'rate' => 100],
            ['step' => 'Validés',   'count' => (int) $stats->issued,
                'rate' => $stats->total > 0 ? round($stats->issued / $stats->total * 100, 1) : 0],
            ['step' => 'Entrés',    'count' => (int) $stats->scanned,
                'rate' => $stats->total > 0 ? round($stats->scanned / $stats->total * 100, 1) : 0],
        ];

        return response()->json([
            'event' => [
                'id' => $event->id, 'title' => $event->title, 'slug' => $event->slug,
                'capacity' => $event->tickets_capacity,
            ],
            'sales_timeseries' => $series,
            'types'            => $typesBreakdown,
            'payment_methods'  => $methodsBreakdown,
            'funnel'           => $funnel,
            'stats'            => [
                'expired'  => (int) $stats->expired,
                'refused'  => (int) $stats->refused,
            ],
        ]);
    }

    public function exportOverview(Request $request)
    {
        abort_unless($request->user()?->can('manage event tickets'), 403);

        $filename = 'billetterie-recap-' . now()->format('Y-m-d_His') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\TicketingOverviewExport(),
            $filename,
        );
    }

    private function methodLabel(?string $code): string
    {
        return match ($code) {
            'orange_money' => 'Orange Money',
            'wave'         => 'Wave',
            'mtn_momo'     => 'MTN MoMo',
            'moov_money'   => 'Moov Money',
            null, ''       => 'Non précisé',
            default        => ucfirst(str_replace('_', ' ', $code)),
        };
    }
}
