<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTicket;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Liste de présence temps réel pour la billetterie.
 *
 * Endpoints :
 *  GET  /api/admin/events/{id}/attendance             → liste JSON + stats (avec ETag)
 *  GET  /api/admin/events/{id}/attendance/export/xlsx → export Excel stylé
 *  GET  /api/admin/events/{id}/attendance/export/pdf  → export PDF stylé (avec logo)
 *  GET  /api/admin/events/{id}/attendance/backup-pdf  → PDF vierge à cocher (mode dégradé)
 *  POST /api/admin/events/{id}/attendance/manual      → check-in manuel (VIP qui a perdu son QR)
 *
 * Sécurité : requiert `view attendance` OU `scan tickets` OU manager scoped.
 */
class EventAttendanceController extends Controller
{
    /**
     * Autorise si l'utilisateur a une des permissions liées OU un grant scoped
     * (manager/scanner) sur l'événement. Sinon 403.
     */
    private function authorize(Request $request, Event $event): void
    {
        $user = $request->user();
        if (! $user) abort(401);

        $hasAny = $user->can('view attendance')
               || $user->can('scan tickets')
               || $user->can('manage event tickets')
               || $event->userCanScan($user);

        if (! $hasAny) {
            abort(response()->json([
                'message' => "Accès refusé : tu n'as pas la permission de voir la liste de présence.",
            ], 403));
        }
    }

    /**
     * Liste + stats + ETag (pour polling léger).
     * Renvoie 304 si le hash n'a pas changé.
     */
    public function index(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $this->authorize($request, $event);

        $sinceMinutes = (int) $request->query('since_minutes', 0);

        $query = EventTicket::query()
            ->where('event_id', $eventId)
            ->where('status', 'used')
            ->whereNotNull('used_at')
            ->with(['ticketType:id,name,name_en,color', 'usedBy:id,name,first_name']);

        if ($sinceMinutes > 0) {
            $query->where('used_at', '>=', now()->subMinutes($sinceMinutes));
        }

        $tickets = $query->orderByDesc('used_at')->get();

        $stats = $this->computeStats($event, $tickets);
        $rows  = $tickets->map(fn (EventTicket $t) => $this->mapTicket($t))->values();

        $lastArrival = $tickets->first()?->used_at;
        $etag = md5($stats['used'] . '|' . ($lastArrival?->timestamp ?? 0) . '|' . $sinceMinutes);

        if ($request->header('If-None-Match') === $etag) {
            return response()->noContent(Response::HTTP_NOT_MODIFIED)
                ->header('ETag', $etag);
        }

        return response()->json([
            'event' => [
                'id'       => $event->id,
                'title'    => $event->display_title ?? $event->title,
                'slug'     => $event->slug,
                'starts_at'=> $event->starts_at,
                'location' => $event->display_location ?? $event->location,
            ],
            'stats' => $stats,
            'rows'  => $rows,
            'now'   => now()->toIso8601String(),
        ])->header('ETag', $etag)->header('Cache-Control', 'private, must-revalidate');
    }

    /** Export Excel. */
    public function exportXlsx(Request $request, int $eventId): BinaryFileResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize($request, $event);

        $filename = 'presence-' . Str::slug($event->title) . '-' . now()->format('Ymd-Hi') . '.xlsx';
        return Excel::download(new AttendanceExport($event), $filename);
    }

    /** Export PDF stylé avec logo + stats + tableau. */
    public function exportPdf(Request $request, int $eventId): Response
    {
        $event = Event::findOrFail($eventId);
        $this->authorize($request, $event);

        $tickets = EventTicket::where('event_id', $eventId)
            ->where('status', 'used')
            ->whereNotNull('used_at')
            ->with(['ticketType:id,name', 'usedBy:id,name,first_name'])
            ->orderBy('used_at')
            ->get();

        $stats = $this->computeStats($event, $tickets);

        $logoPath = $this->resolveLogoPath();
        $logoDataUri = null;
        if ($logoPath) {
            $ext = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
            $mime = $ext === 'svg' ? 'image/svg+xml' : ($ext === 'jpg' || $ext === 'jpeg' ? 'image/jpeg' : 'image/png');
            $logoDataUri = 'data:' . $mime . ';base64,' . base64_encode(@file_get_contents($logoPath));
        }

        $filename = 'presence-' . Str::slug($event->title) . '-' . now()->format('Ymd-Hi') . '.pdf';

        $pdf = Pdf::loadView('pdfs.attendance', [
            'event'       => $event,
            'tickets'     => $tickets,
            'stats'       => $stats,
            'logoDataUri' => $logoDataUri,
            'generatedAt' => now(),
            'mode'        => 'live',
        ])->setPaper('a4', 'portrait');

        return $pdf->stream($filename);
    }

    /** PDF vierge (backup papier — si internet tombe, l'accueil coche à la main). */
    public function backupPdf(Request $request, int $eventId): Response
    {
        $event = Event::findOrFail($eventId);
        $this->authorize($request, $event);

        // Tous les tickets vendus et émis (confirmed + used), triés par nom
        $tickets = EventTicket::where('event_id', $eventId)
            ->whereIn('status', ['confirmed', 'used'])
            ->with(['ticketType:id,name'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $logoPath = $this->resolveLogoPath();
        $logoDataUri = null;
        if ($logoPath) {
            $ext = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
            $mime = $ext === 'svg' ? 'image/svg+xml' : ($ext === 'jpg' || $ext === 'jpeg' ? 'image/jpeg' : 'image/png');
            $logoDataUri = 'data:' . $mime . ';base64,' . base64_encode(@file_get_contents($logoPath));
        }

        $stats = [
            'capacity' => $event->tickets_capacity,
            'sold'     => $tickets->count(),
        ];

        $filename = 'presence-backup-' . Str::slug($event->title) . '-' . now()->format('Ymd-Hi') . '.pdf';

        $pdf = Pdf::loadView('pdfs.attendance', [
            'event'       => $event,
            'tickets'     => $tickets,
            'stats'       => $stats,
            'logoDataUri' => $logoDataUri,
            'generatedAt' => now(),
            'mode'        => 'backup',
        ])->setPaper('a4', 'portrait');

        return $pdf->stream($filename);
    }

    /**
     * Check-in manuel — pour un VIP qui a perdu son QR.
     * Log qui a marqué + note.
     */
    public function manualCheckIn(Request $request, int $eventId): JsonResponse
    {
        $event = Event::findOrFail($eventId);
        $this->authorize($request, $event);

        $user = $request->user();
        if (! $user->can('scan tickets') && ! $user->can('manage event tickets')
            && ! $event->userCanScan($user)) {
            abort(response()->json([
                'message' => "Le check-in manuel requiert la permission 'scan tickets'.",
            ], 403));
        }

        $data = $request->validate([
            'ticket_id' => ['required', 'integer', 'exists:event_tickets,id'],
            'note'      => ['nullable', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($data, $user, $request, $eventId) {
            $ticket = EventTicket::where('event_id', $eventId)
                ->lockForUpdate()
                ->findOrFail($data['ticket_id']);

            if ($ticket->status === 'used') {
                return response()->json([
                    'message' => 'Déjà scanné à ' . $ticket->used_at?->format('H:i'),
                    'already' => true,
                    'ticket'  => $this->mapTicket($ticket->fresh(['ticketType', 'usedBy'])),
                ], 200);
            }
            if ($ticket->status !== 'confirmed') {
                return response()->json([
                    'message' => "Ticket non valide (statut : {$ticket->status}).",
                ], 422);
            }
            if ($ticket->is_refunded) {
                return response()->json(['message' => 'Ticket remboursé, inutilisable.'], 422);
            }

            $ticket->forceFill([
                'status'    => 'used',
                'used_at'   => now(),
                'used_by_id'=> $user->id,
                'scan_ip'   => $request->ip(),
            ])->save();

            \Log::info('Manual check-in', [
                'event_id'  => $eventId,
                'ticket_id' => $ticket->id,
                'by'        => $user->id,
                'note'      => $data['note'] ?? null,
            ]);

            return response()->json([
                'message' => 'Personne marquée comme présente.',
                'ticket'  => $this->mapTicket($ticket->fresh(['ticketType', 'usedBy'])),
            ]);
        });
    }

    // ─────────────────────────────────────────────────────────────

    private function mapTicket(EventTicket $t): array
    {
        return [
            'id'           => $t->id,
            'full_name'    => trim($t->first_name . ' ' . $t->last_name),
            'first_name'   => $t->first_name,
            'last_name'    => $t->last_name,
            'phone'        => $t->phone,
            'email'        => $t->email,
            'short_code'   => $t->short_code,
            'ticket_type'  => $t->ticketType?->name,
            'used_at'      => $t->used_at?->toIso8601String(),
            'used_at_hm'   => $t->used_at?->format('H:i'),
            'used_by'      => $t->usedBy ? trim(($t->usedBy->first_name ?? '') . ' ' . ($t->usedBy->name ?? '')) : null,
        ];
    }

    private function computeStats(Event $event, $tickets): array
    {
        // Total sold = confirmed + used
        $sold = EventTicket::where('event_id', $event->id)
            ->whereIn('status', ['confirmed', 'used'])
            ->count();

        $used = $tickets->count();

        // Arrivées par tranche de 15 min (dernières 4h max, pour un mini graph)
        $buckets = [];
        foreach ($tickets as $t) {
            if (! $t->used_at) continue;
            $key = $t->used_at->format('H:i');
            $roundedMin = (int) floor($t->used_at->minute / 15) * 15;
            $bucketKey = $t->used_at->format('H:') . str_pad((string) $roundedMin, 2, '0', STR_PAD_LEFT);
            $buckets[$bucketKey] = ($buckets[$bucketKey] ?? 0) + 1;
        }
        ksort($buckets);

        return [
            'capacity'      => $event->tickets_capacity,
            'sold'          => $sold,
            'used'          => $used,
            'remaining'     => max(0, $sold - $used),
            'fill_rate'     => $sold > 0 ? round($used / $sold * 100, 1) : 0,
            'last_15_min'   => $tickets->filter(fn ($t) => $t->used_at && $t->used_at->gte(now()->subMinutes(15)))->count(),
            'buckets_15m'   => $buckets,
            'starts_at'     => $event->starts_at,
        ];
    }

    /** Résout le logo NWC — même stratégie que MembersExport. */
    protected function resolveLogoPath(): ?string
    {
        $candidates = [
            public_path('logos/logo_newwine.png'),
            base_path('public/logos/logo_newwine.png'),
            dirname(base_path()) . '/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $path) {
            if ($path && @file_exists($path)) return $path;
        }

        $cached = storage_path('app/exports-logo-cache/logo_newwine.png');
        if (@file_exists($cached) && filesize($cached) > 500) return $cached;

        $url = rtrim(config('app.frontend_url', 'https://newwinechurch.ci'), '/')
             . '/logos/logo_newwine.png';
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 5, 'follow_location' => 1]]);
            $content = @file_get_contents($url, false, $ctx);
            if ($content && strlen($content) > 500) {
                @mkdir(dirname($cached), 0775, true);
                @file_put_contents($cached, $content);
                return $cached;
            }
        } catch (\Throwable $e) {
            // silencieux
        }
        return null;
    }
}
