<?php

namespace App\Http\Controllers\Admin;

use App\Exports\EventEnrolementsExport;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\MembershipRequest;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Enrôlements par événement — vue admin dédiée.
 *
 * Chaque événement peut avoir sa propre liste d'enrôlements (leads captés via
 * le QR "Suis-nous" paramétré avec ?event={id}). Cette vue est GÉNÉRIQUE :
 * un onglet apparaît sur la page événement admin, indépendamment du type
 * d'event (bal, concert, retraite…).
 *
 * Sécurité : requiert `view members` (idem membership_requests classiques).
 * Actions : lister, changer statut, saisir notes, exports Excel/PDF.
 */
class EventEnrolementsController extends Controller
{
    private function authorize(Request $request): void
    {
        abort_unless($request->user()?->can('view members'), 403);
    }

    /** GET /admin/events/{id}/enrolements — liste paginée avec filtres. */
    public function index(Request $request, int $eventId): JsonResponse
    {
        $this->authorize($request);
        $event = Event::findOrFail($eventId);

        $query = MembershipRequest::query()
            ->forEvent($event->id)
            ->enrollments()
            ->with('interestedDepartment:id,name,color_theme,color')
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('enrollment_status', $status);
        }

        if ($type = $request->query('type')) {
            $query->where('enrollment_type', $type);
        }

        if ($q = trim((string) $request->query('q'))) {
            $query->where(function ($sub) use ($q) {
                $sub->where('first_name', 'like', "%{$q}%")
                    ->orWhere('name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 25), 100);
        $items = $query->paginate($perPage)->through(fn ($r) => $this->format($r));

        // Stats globales (indépendantes des filtres) — pour cartes en haut.
        $stats = MembershipRequest::query()
            ->forEvent($event->id)
            ->enrollments()
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN enrollment_status = 'nouveau'  THEN 1 ELSE 0 END) as nouveau,
                SUM(CASE WHEN enrollment_status = 'contacte' THEN 1 ELSE 0 END) as contacte,
                SUM(CASE WHEN enrollment_status = 'converti' THEN 1 ELSE 0 END) as converti,
                SUM(CASE WHEN enrollment_status = 'ecarte'   THEN 1 ELSE 0 END) as ecarte,
                SUM(CASE WHEN enrollment_type = 'discover'   THEN 1 ELSE 0 END) as discover_count,
                SUM(CASE WHEN enrollment_type = 'department' THEN 1 ELSE 0 END) as department_count
            ")
            ->first();

        return response()->json([
            'event' => [
                'id'        => $event->id,
                'title'     => $event->title,
                'starts_at' => $event->starts_at?->toIso8601String(),
            ],
            'stats' => [
                'total'      => (int) $stats->total,
                'nouveau'    => (int) $stats->nouveau,
                'contacte'   => (int) $stats->contacte,
                'converti'   => (int) $stats->converti,
                'ecarte'     => (int) $stats->ecarte,
                'discover'   => (int) $stats->discover_count,
                'department' => (int) $stats->department_count,
            ],
            'enrolements' => $items,
        ]);
    }

    /** PATCH /admin/events/{id}/enrolements/{enrolId}/status */
    public function updateStatus(Request $request, int $eventId, int $enrolId): JsonResponse
    {
        $this->authorize($request);
        $data = $request->validate([
            'enrollment_status' => ['required', 'in:nouveau,contacte,converti,ecarte'],
        ]);

        $enrol = MembershipRequest::forEvent($eventId)->enrollments()->findOrFail($enrolId);
        $enrol->update(['enrollment_status' => $data['enrollment_status']]);

        return response()->json(['message' => 'Statut mis à jour.', 'enrolement' => $this->format($enrol->fresh())]);
    }

    /** PATCH /admin/events/{id}/enrolements/{enrolId}/notes */
    public function updateNotes(Request $request, int $eventId, int $enrolId): JsonResponse
    {
        $this->authorize($request);
        $data = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $enrol = MembershipRequest::forEvent($eventId)->enrollments()->findOrFail($enrolId);
        $enrol->update(['admin_notes' => $data['admin_notes']]);

        return response()->json(['message' => 'Note enregistrée.']);
    }

    /** DELETE /admin/events/{id}/enrolements/{enrolId} */
    public function destroy(Request $request, int $eventId, int $enrolId): JsonResponse
    {
        $this->authorize($request);
        $enrol = MembershipRequest::forEvent($eventId)->enrollments()->findOrFail($enrolId);
        $enrol->delete();
        return response()->json(['message' => 'Enrôlement supprimé.']);
    }

    /** GET /admin/events/{id}/enrolements/export/excel */
    public function exportExcel(Request $request, int $eventId)
    {
        $this->authorize($request);
        $event = Event::findOrFail($eventId);
        $filename = 'enrolements-' . \Illuminate\Support\Str::slug($event->title) . '-' . now()->format('Ymd-Hi') . '.xlsx';
        return Excel::download(new EventEnrolementsExport($event), $filename);
    }

    /** GET /admin/events/{id}/enrolements/export/pdf */
    public function exportPdf(Request $request, int $eventId): Response
    {
        $this->authorize($request);
        $event = Event::findOrFail($eventId);

        $enrolements = MembershipRequest::forEvent($event->id)
            ->enrollments()
            ->with('interestedDepartment:id,name')
            ->orderBy('enrollment_status')
            ->orderByDesc('created_at')
            ->get();

        $pdf = Pdf::loadView('pdfs.event-enrolements', [
            'event'       => $event,
            'enrolements' => $enrolements,
            'logoDataUri' => $this->resolveLogoDataUri(),
            'generatedAt' => now(),
        ])->setPaper('a4', 'landscape');

        $filename = 'enrolements-' . \Illuminate\Support\Str::slug($event->title) . '-' . now()->format('Ymd-Hi') . '.pdf';
        return $pdf->stream($filename);
    }

    /** Format un enrôlement pour l'API (extrait WhatsApp depuis motivation). */
    private function format(MembershipRequest $r): array
    {
        $whatsapp = null;
        if ($r->motivation && preg_match('/WhatsApp\s*:\s*([^·]+)/i', $r->motivation, $m)) {
            $whatsapp = trim($m[1]);
        }

        return [
            'id'                => $r->id,
            'created_at'        => $r->created_at?->toIso8601String(),
            'first_name'        => $r->first_name,
            'name'              => $r->name,
            'phone'             => $r->phone,
            'whatsapp'          => $whatsapp,
            'city'              => $r->city,
            'enrollment_type'   => $r->enrollment_type,
            'enrollment_status' => $r->enrollment_status ?: 'nouveau',
            'department'        => $r->interestedDepartment ? [
                'id'    => $r->interestedDepartment->id,
                'name'  => $r->interestedDepartment->name,
                'color' => $r->interestedDepartment->color_theme ?: $r->interestedDepartment->color,
            ] : null,
            'admin_notes'       => $r->admin_notes,
        ];
    }

    /** Logo NWC en data URI (pour PDF). */
    private function resolveLogoDataUri(): ?string
    {
        $candidates = [
            public_path('logos/logo_newwine.png'),
            base_path('public/logos/logo_newwine.png'),
            dirname(base_path()) . '/public_html/logos/logo_newwine.png',
        ];
        foreach ($candidates as $path) {
            if ($path && @file_exists($path) && filesize($path) > 500) {
                return 'data:image/png;base64,' . base64_encode(file_get_contents($path));
            }
        }
        return null;
    }
}
