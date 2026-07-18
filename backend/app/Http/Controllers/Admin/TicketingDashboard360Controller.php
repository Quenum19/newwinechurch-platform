<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Sprint C — Dashboard billetterie 360°.
 *
 *  GET /api/admin/billetterie/dashboard-360/kpis
 *  GET /api/admin/billetterie/dashboard-360/revenue-timeline?days=30
 *  GET /api/admin/billetterie/dashboard-360/payment-breakdown?period=month
 *  GET /api/admin/billetterie/dashboard-360/top-events?limit=5
 *  GET /api/admin/billetterie/dashboard-360/alerts
 *  GET /api/admin/billetterie/dashboard-360/segmentation
 *  GET /api/admin/billetterie/dashboard-360/no-show-rate
 *  GET /api/admin/billetterie/dashboard-360/live-scans
 *  GET /api/admin/billetterie/dashboard-360/export-monthly?year=YYYY&month=MM
 *
 * Toutes les routes sont protégées par la permission `view billetterie dashboard`.
 * Cache 60s pour éviter de solliciter la BDD à chaque poll.
 */
class TicketingDashboard360Controller extends Controller
{
    /** Durée du cache (en secondes) pour éviter surcharge BDD. */
    private const CACHE_TTL = 60;

    /**
     * KPIs globaux temps réel (section 1).
     */
    public function kpis(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        return response()->json(Cache::remember('bill360:kpis', self::CACHE_TTL, function () {
            $now       = now();
            $monthStart = $now->copy()->startOfMonth();
            $monthEnd   = $now->copy()->endOfMonth();
            $prevStart  = $now->copy()->subMonthNoOverflow()->startOfMonth();
            $prevEnd    = $now->copy()->subMonthNoOverflow()->endOfMonth();

            // Tickets vendus mois en cours vs mois précédent.
            $currentTickets = EventTicket::whereIn('payment_status', ['free', 'paid'])
                ->whereBetween('created_at', [$monthStart, $monthEnd])->count();
            $prevTickets = EventTicket::whereIn('payment_status', ['free', 'paid'])
                ->whereBetween('created_at', [$prevStart, $prevEnd])->count();

            // Revenus mois en cours vs mois précédent.
            $currentRevenue = (int) EventTicket::where('payment_status', 'paid')
                ->whereBetween('payment_validated_at', [$monthStart, $monthEnd])
                ->sum('price_fcfa');
            $prevRevenue = (int) EventTicket::where('payment_status', 'paid')
                ->whereBetween('payment_validated_at', [$prevStart, $prevEnd])
                ->sum('price_fcfa');

            // Panier moyen : revenu total / nombre de commandes distinctes (order_code).
            $orders = EventTicket::whereIn('payment_status', ['free', 'paid'])
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->distinct('order_code')
                ->count('order_code');
            $avgBasket = $orders > 0 ? (int) round($currentRevenue / $orders) : 0;

            // Taux conversion : issued / total sur le mois en cours.
            $totalCreated = EventTicket::whereBetween('created_at', [$monthStart, $monthEnd])
                ->whereIn('payment_status', ['pending', 'paid', 'free', 'refused', 'expired'])
                ->count();
            $conversionRate = $totalCreated > 0
                ? round($currentTickets / $totalCreated * 100, 1)
                : null;

            // Prochain event à venir avec billetterie active.
            $nextEvent = Event::where('ticketing_enabled', true)
                ->where('starts_at', '>=', $now)
                ->orderBy('starts_at')
                ->first();
            $nextEventPayload = null;
            if ($nextEvent) {
                $sold = EventTicket::where('event_id', $nextEvent->id)
                    ->whereIn('payment_status', ['free', 'paid'])
                    ->whereIn('status', ['confirmed', 'used'])->count();
                $fill = $nextEvent->tickets_capacity
                    ? round($sold / $nextEvent->tickets_capacity * 100, 1) : null;
                $nextEventPayload = [
                    'id'         => $nextEvent->id,
                    'title'      => $nextEvent->title,
                    'starts_at'  => $nextEvent->starts_at?->toIso8601String(),
                    'days_left'  => (int) round($now->diffInDays($nextEvent->starts_at, false)),
                    'capacity'   => $nextEvent->tickets_capacity,
                    'sold'       => $sold,
                    'fill_rate'  => $fill,
                ];
            }

            // Actions en attente : paiements pending + waitlist (approximée
            // ici par les tickets en pending ancien).
            $pendingPayments = EventTicket::where('payment_status', 'pending')->count();

            return [
                'tickets_current'         => $currentTickets,
                'tickets_previous'        => $prevTickets,
                'tickets_variation_pct'   => $this->variationPct($currentTickets, $prevTickets),

                'revenue_current'         => $currentRevenue,
                'revenue_previous'        => $prevRevenue,
                'revenue_variation_pct'   => $this->variationPct($currentRevenue, $prevRevenue),

                'conversion_rate'         => $conversionRate,
                'average_basket'          => $avgBasket,

                'next_event'              => $nextEventPayload,

                'pending_payments'        => $pendingPayments,
                'pending_over_24h'        => EventTicket::where('payment_status', 'pending')
                                                        ->where('created_at', '<', $now->copy()->subDay())
                                                        ->count(),
                'generated_at'            => $now->toIso8601String(),
            ];
        }));
    }

    /**
     * Timeline revenus + cumul mensuel (section 2).
     */
    public function revenueTimeline(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        $days = min(90, max(7, (int) $request->query('days', 30)));

        return response()->json(Cache::remember("bill360:timeline:{$days}", self::CACHE_TTL, function () use ($days) {
            $start = now()->subDays($days - 1)->startOfDay();

            $rows = EventTicket::selectRaw('
                DATE(payment_validated_at) as day,
                SUM(price_fcfa) as revenue,
                COUNT(*) as tickets_count
            ')
            ->where('payment_status', 'paid')
            ->whereNotNull('payment_validated_at')
            ->where('payment_validated_at', '>=', $start)
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->keyBy('day');

            $series = [];
            $cumulative = 0;
            $monthCumulative = 0;
            $currentMonthKey = null;
            for ($i = 0; $i < $days; $i++) {
                $d      = $start->copy()->addDays($i);
                $key    = $d->format('Y-m-d');
                $monthK = $d->format('Y-m');
                if ($currentMonthKey !== $monthK) {
                    $currentMonthKey = $monthK;
                    $monthCumulative = 0;
                }
                $rev    = (int) ($rows[$key]->revenue ?? 0);
                $count  = (int) ($rows[$key]->tickets_count ?? 0);
                $cumulative      += $rev;
                $monthCumulative += $rev;
                $series[] = [
                    'day'              => $key,
                    'label'            => $d->locale('fr')->isoFormat('D MMM'),
                    'revenue'          => $rev,
                    'tickets_count'    => $count,
                    'cumulative'       => $cumulative,
                    'month_cumulative' => $monthCumulative,
                ];
            }

            return ['data' => $series, 'days' => $days];
        }));
    }

    /**
     * Répartition paiements (Mobile Money / CinetPay / cash / gratuit).
     */
    public function paymentBreakdown(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        $period = $request->query('period', 'month');
        [$start, $end] = $this->resolvePeriod($period);

        $key = "bill360:payment-breakdown:{$period}";

        return response()->json(Cache::remember($key, self::CACHE_TTL, function () use ($start, $end) {
            // Paid tickets → regroupés par groupe logique.
            $paidRows = EventTicket::whereIn('payment_status', ['paid'])
                ->when($start, fn ($q) => $q->where('payment_validated_at', '>=', $start))
                ->when($end,   fn ($q) => $q->where('payment_validated_at', '<=', $end))
                ->selectRaw('payment_method, gateway_provider, COUNT(*) as count, SUM(price_fcfa) as revenue')
                ->groupBy('payment_method', 'gateway_provider')
                ->get();

            $buckets = [
                'mobile_money' => ['label' => 'Mobile Money',  'count' => 0, 'revenue' => 0],
                'cinetpay'     => ['label' => 'CinetPay',      'count' => 0, 'revenue' => 0],
                'cash'         => ['label' => 'Espèces',       'count' => 0, 'revenue' => 0],
                'other'        => ['label' => 'Autre',         'count' => 0, 'revenue' => 0],
            ];
            foreach ($paidRows as $r) {
                $bucket = $this->bucketPayment($r->payment_method, $r->gateway_provider);
                $buckets[$bucket]['count']   += (int) $r->count;
                $buckets[$bucket]['revenue'] += (int) $r->revenue;
            }

            // Free (tickets gratuits, hors paiement).
            $freeCount = EventTicket::where('payment_status', 'free')
                ->when($start, fn ($q) => $q->where('created_at', '>=', $start))
                ->when($end,   fn ($q) => $q->where('created_at', '<=', $end))
                ->count();

            $data = [];
            foreach ($buckets as $key => $b) {
                if ($b['count'] > 0) {
                    $data[] = ['key' => $key, 'label' => $b['label'], 'count' => $b['count'], 'revenue' => $b['revenue']];
                }
            }
            if ($freeCount > 0) {
                $data[] = ['key' => 'free', 'label' => 'Gratuit', 'count' => $freeCount, 'revenue' => 0];
            }

            $totalCount   = array_sum(array_column($data, 'count'));
            $totalRevenue = array_sum(array_column($data, 'revenue'));

            return [
                'data'          => $data,
                'total_count'   => $totalCount,
                'total_revenue' => $totalRevenue,
                'period'        => ['start' => $start?->toIso8601String(), 'end' => $end?->toIso8601String()],
            ];
        }));
    }

    /**
     * Top N events performants du mois (section 4).
     */
    public function topEvents(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        $limit = min(20, max(3, (int) $request->query('limit', 5)));

        return response()->json(Cache::remember("bill360:top-events:{$limit}", self::CACHE_TTL, function () use ($limit) {
            $monthStart = now()->startOfMonth();
            $monthEnd   = now()->endOfMonth();

            $rows = Event::where('ticketing_enabled', true)
                ->with(['tickets' => function ($q) use ($monthStart, $monthEnd) {
                    // Ne charge que les tickets liés au mois (créés OU validés dans la fenêtre).
                    $q->select('id', 'event_id', 'status', 'payment_status', 'price_fcfa', 'created_at', 'payment_validated_at')
                      ->where(function ($qq) use ($monthStart, $monthEnd) {
                          $qq->whereBetween('created_at', [$monthStart, $monthEnd])
                             ->orWhereBetween('payment_validated_at', [$monthStart, $monthEnd]);
                      });
                }])
                ->get()
                ->map(function (Event $event) {
                    $tickets = $event->tickets;
                    $sold = $tickets->whereIn('payment_status', ['free', 'paid'])
                                    ->whereIn('status', ['confirmed', 'used'])->count();
                    $revenue = $tickets->where('payment_status', 'paid')->sum('price_fcfa');
                    $fill = $event->tickets_capacity ? round($sold / $event->tickets_capacity * 100, 1) : null;
                    return [
                        'id'        => $event->id,
                        'title'     => $event->title,
                        'slug'      => $event->slug,
                        'starts_at' => $event->starts_at?->toIso8601String(),
                        'capacity'  => $event->tickets_capacity,
                        'sold'      => $sold,
                        'fill_rate' => $fill,
                        'revenue'   => (int) $revenue,
                    ];
                })
                ->filter(fn ($e) => $e['sold'] > 0 || $e['revenue'] > 0)
                ->sortByDesc('revenue')
                ->take($limit)
                ->values();

            return ['data' => $rows];
        }));
    }

    /**
     * Alertes actives (section 5).
     */
    public function alerts(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        return response()->json(Cache::remember('bill360:alerts', self::CACHE_TTL, function () {
            $alerts = [];

            // === 1. Events à 90%+ de capacité ===
            $nearFull = Event::where('ticketing_enabled', true)
                ->whereNotNull('tickets_capacity')
                ->where('starts_at', '>=', now())
                ->with(['tickets' => fn ($q) => $q->select('id', 'event_id', 'status', 'payment_status')])
                ->get()
                ->map(function (Event $e) {
                    $sold = $e->tickets->whereIn('payment_status', ['free', 'paid'])
                                       ->whereIn('status', ['confirmed', 'used'])->count();
                    return ['event' => $e, 'sold' => $sold, 'fill' => $e->tickets_capacity ? $sold / $e->tickets_capacity * 100 : 0];
                })
                ->filter(fn ($r) => $r['fill'] >= 90);

            foreach ($nearFull as $r) {
                $alerts[] = [
                    'severity' => $r['fill'] >= 100 ? 'critical' : 'warning',
                    'type'     => 'near_full',
                    'title'    => sprintf('« %s » à %s%% de sa capacité', $r['event']->title, round($r['fill'], 0)),
                    'detail'   => "{$r['sold']} / {$r['event']->tickets_capacity} places",
                    'link'     => "/admin/evenements/{$r['event']->id}/billetterie",
                ];
            }

            // === 2. Paiements pending > 24h ===
            $oldPending = EventTicket::where('payment_status', 'pending')
                ->where('created_at', '<', now()->subDay())
                ->select('event_id', DB::raw('COUNT(DISTINCT order_code) as orders_count'))
                ->groupBy('event_id')
                ->with('event:id,title')
                ->get();
            foreach ($oldPending as $row) {
                if (! $row->event) continue;
                $alerts[] = [
                    'severity' => 'warning',
                    'type'     => 'old_pending',
                    'title'    => "{$row->orders_count} paiement(s) en attente depuis +24h",
                    'detail'   => "Event : {$row->event->title}",
                    'link'     => "/admin/evenements/{$row->event_id}/billetterie",
                ];
            }

            // === 3. Tickets non-scannés à J-1 d'events proches ===
            $tomorrow = now()->addDay()->endOfDay();
            $imminentEvents = Event::where('ticketing_enabled', true)
                ->whereBetween('starts_at', [now(), $tomorrow])
                ->with(['tickets' => fn ($q) => $q->select('id', 'event_id', 'status', 'payment_status')])
                ->get();
            foreach ($imminentEvents as $ev) {
                $issued = $ev->tickets->whereIn('payment_status', ['free', 'paid'])->count();
                $scanned = $ev->tickets->where('status', 'used')->count();
                $notScanned = $issued - $scanned;
                if ($notScanned > 0 && $issued > 0) {
                    $alerts[] = [
                        'severity' => 'info',
                        'type'     => 'imminent_event',
                        'title'    => "« {$ev->title} » démarre bientôt",
                        'detail'   => "{$notScanned} ticket(s) émis non encore scanné(s)",
                        'link'     => "/admin/evenements/{$ev->id}/billetterie",
                    ];
                }
            }

            return ['data' => $alerts, 'total' => count($alerts)];
        }));
    }

    /**
     * Segmentation clients : nouveaux membres / anciens membres / non-membres.
     */
    public function segmentation(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        return response()->json(Cache::remember('bill360:segmentation', self::CACHE_TTL, function () {
            $sixMonthsAgo = now()->subMonths(6);

            // Emails distincts des acheteurs (paid ou free = a un ticket confirmé).
            $rows = EventTicket::selectRaw('LOWER(email) as email, COUNT(*) as tickets_count')
                ->whereIn('payment_status', ['free', 'paid'])
                ->whereNotNull('email')
                ->groupBy('email')
                ->get();

            $memberEmails = User::whereNotNull('email')
                ->select('email', 'created_at')
                ->get()
                ->keyBy(fn ($u) => strtolower($u->email));

            $segments = [
                ['segment' => 'Nouveaux membres', 'count' => 0, 'tickets' => 0],
                ['segment' => 'Anciens membres',  'count' => 0, 'tickets' => 0],
                ['segment' => 'Non-membres',      'count' => 0, 'tickets' => 0],
            ];
            foreach ($rows as $r) {
                $user = $memberEmails[strtolower($r->email)] ?? null;
                if ($user) {
                    if ($user->created_at && $user->created_at->gte($sixMonthsAgo)) {
                        $segments[0]['count']++;
                        $segments[0]['tickets'] += (int) $r->tickets_count;
                    } else {
                        $segments[1]['count']++;
                        $segments[1]['tickets'] += (int) $r->tickets_count;
                    }
                } else {
                    $segments[2]['count']++;
                    $segments[2]['tickets'] += (int) $r->tickets_count;
                }
            }

            return ['data' => $segments];
        }));
    }

    /**
     * Taux no-show pour events passés.
     */
    public function noShowRate(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        $limit = min(20, max(5, (int) $request->query('limit', 10)));

        return response()->json(Cache::remember("bill360:no-show:{$limit}", self::CACHE_TTL, function () use ($limit) {
            $events = Event::where('ticketing_enabled', true)
                ->where('starts_at', '<', now())
                ->orderByDesc('starts_at')
                ->limit($limit)
                ->with(['tickets' => fn ($q) => $q->select('id', 'event_id', 'status', 'payment_status')])
                ->get()
                ->map(function (Event $e) {
                    $issued  = $e->tickets->whereIn('payment_status', ['free', 'paid'])->count();
                    $scanned = $e->tickets->where('status', 'used')->count();
                    $noShow  = max(0, $issued - $scanned);
                    return [
                        'id'         => $e->id,
                        'title'      => $e->title,
                        'starts_at'  => $e->starts_at?->toIso8601String(),
                        'issued'     => $issued,
                        'scanned'    => $scanned,
                        'no_show'    => $noShow,
                        'show_rate'  => $issued > 0 ? round($scanned / $issued * 100, 1) : 0,
                        'no_show_rate' => $issued > 0 ? round($noShow / $issued * 100, 1) : 0,
                    ];
                })
                ->filter(fn ($e) => $e['issued'] > 0)
                ->values();

            return ['data' => $events];
        }));
    }

    /**
     * Métriques scan temps réel : events du jour.
     */
    public function liveScans(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        // TTL plus court pour ce widget (30s) — il représente l'activité live.
        return response()->json(Cache::remember('bill360:live-scans', 30, function () {
            $dayStart = now()->startOfDay();
            $dayEnd   = now()->endOfDay();

            $events = Event::where('ticketing_enabled', true)
                ->whereBetween('starts_at', [$dayStart, $dayEnd])
                ->with(['tickets' => fn ($q) => $q->select('id', 'event_id', 'status', 'payment_status', 'used_at')])
                ->get()
                ->map(function (Event $e) {
                    $tickets = $e->tickets;
                    $issued  = $tickets->whereIn('payment_status', ['free', 'paid'])->count();
                    $scanned = $tickets->where('status', 'used')->count();
                    // Dernière minute d'activité.
                    $lastScan = $tickets->where('used_at', '!=', null)->max('used_at');
                    $scannedLastHour = $tickets->filter(function ($t) {
                        return $t->used_at && $t->used_at >= now()->subHour();
                    })->count();
                    return [
                        'id'                => $e->id,
                        'title'             => $e->title,
                        'starts_at'         => $e->starts_at?->toIso8601String(),
                        'issued'            => $issued,
                        'scanned'           => $scanned,
                        'pending_check_in'  => max(0, $issued - $scanned),
                        'progress_pct'      => $issued > 0 ? round($scanned / $issued * 100, 1) : 0,
                        'scanned_last_hour' => $scannedLastHour,
                        'last_scan_at'      => $lastScan ? Carbon::parse($lastScan)->toIso8601String() : null,
                    ];
                })
                ->values();

            return ['data' => $events, 'has_events_today' => $events->count() > 0];
        }));
    }

    /**
     * Export Excel du rapport mensuel billetterie.
     */
    public function exportMonthly(Request $request)
    {
        abort_unless($request->user()?->can('view billetterie dashboard'), 403);

        $year  = (int) $request->query('year',  now()->year);
        $month = (int) $request->query('month', now()->month);

        if ($month < 1 || $month > 12 || $year < 2020 || $year > 2100) {
            return response()->json(['message' => 'Année/mois invalides.'], 422);
        }

        $filename = sprintf('billetterie-mensuel-%d-%02d.xlsx', $year, $month);

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\MonthlyBilletterieReport($year, $month),
            $filename,
        );
    }

    // ==========================================================
    // Helpers privés
    // ==========================================================

    /** Variation en pourcentage entre deux valeurs (null si ancienne = 0). */
    private function variationPct(int|float $current, int|float $previous): ?float
    {
        if ($previous <= 0) return $current > 0 ? 100.0 : null;
        return round(($current - $previous) / $previous * 100, 1);
    }

    /**
     * Résout une période textuelle en (start, end).
     *  - month           : ce mois
     *  - last_month      : mois précédent
     *  - last_3_months   : 3 derniers mois
     *  - year            : cette année
     */
    private function resolvePeriod(string $period): array
    {
        return match ($period) {
            'last_month'    => [now()->subMonthNoOverflow()->startOfMonth(), now()->subMonthNoOverflow()->endOfMonth()],
            'last_3_months' => [now()->subMonths(3)->startOfDay(), now()],
            'year'          => [now()->startOfYear(), now()->endOfYear()],
            default         => [now()->startOfMonth(), now()->endOfMonth()], // month
        };
    }

    /**
     * Regroupe les méthodes de paiement en 4 buckets logiques.
     */
    private function bucketPayment(?string $method, ?string $gateway): string
    {
        $g = strtolower((string) $gateway);
        $m = strtolower((string) $method);
        if (in_array($g, ['cinetpay'], true)) return 'cinetpay';
        if (in_array($m, ['orange_money', 'wave', 'mtn_momo', 'moov_money', 'mobile_money'], true)) return 'mobile_money';
        if ($m === 'cash' || $m === 'especes' || $m === 'espèces') return 'cash';
        return 'other';
    }
}
