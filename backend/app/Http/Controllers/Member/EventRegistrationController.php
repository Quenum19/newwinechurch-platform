<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventRegistrationResource;
use App\Models\Event;
use App\Models\EventRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Inscription / désinscription aux événements + liste de mes inscriptions.
 *
 * Sécurité :
 *  - Transaction DB pour la double-vérification (capacité + unicité) atomique
 *  - SELECT FOR UPDATE pour empêcher la course en cas de places limitées
 */
class EventRegistrationController extends Controller
{
    /**
     * Inscription à un événement.
     * Renvoie 409 Conflict si :
     *  - déjà inscrit
     *  - événement plein
     *  - deadline dépassée
     *  - inscription désactivée
     */
    public function register(Request $request, int $eventId): JsonResponse
    {
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($eventId, $userId) {
            // SELECT FOR UPDATE → verrou ligne, anti-course.
            $event = Event::where('id', $eventId)->lockForUpdate()->firstOrFail();

            if (! $event->is_published) {
                return ['error' => 'Cet événement n\'est pas accessible.', 'status' => 404];
            }

            if (! $event->registration_required) {
                return ['error' => 'Cet événement ne nécessite pas d\'inscription.', 'status' => 409];
            }

            if ($event->registration_deadline && now()->gt($event->registration_deadline)) {
                return ['error' => 'La date limite d\'inscription est dépassée.', 'status' => 409];
            }

            if ($event->starts_at && now()->gt($event->starts_at)) {
                return ['error' => 'L\'événement a déjà commencé.', 'status' => 409];
            }

            // Capacité ?
            if ($event->max_attendees) {
                $count = EventRegistration::where('event_id', $event->id)
                    ->where('status', 'registered')->count();
                if ($count >= $event->max_attendees) {
                    return ['error' => 'L\'événement est complet.', 'status' => 409];
                }
            }

            // Déjà inscrit ?
            $existing = EventRegistration::where('event_id', $event->id)
                ->where('user_id', $userId)->first();

            if ($existing && $existing->status === 'registered') {
                return ['error' => 'Vous êtes déjà inscrit à cet événement.', 'status' => 409];
            }

            // Réinscription après annulation : on réutilise la ligne.
            if ($existing) {
                $existing->update([
                    'status'        => 'registered',
                    'registered_at' => now(),
                ]);
                return ['registration' => $existing->fresh()];
            }

            return [
                'registration' => EventRegistration::create([
                    'event_id'      => $event->id,
                    'user_id'       => $userId,
                    'status'        => 'registered',
                    'registered_at' => now(),
                ]),
            ];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json([
            'message'      => 'Inscription confirmée. À très vite !',
            'registration' => new EventRegistrationResource($result['registration']),
        ], 201);
    }

    /**
     * Désinscription (status passe à "cancelled" — on ne supprime pas pour l'historique).
     */
    public function unregister(Request $request, int $eventId): JsonResponse
    {
        $registration = EventRegistration::where('event_id', $eventId)
            ->where('user_id', $request->user()->id)
            ->where('status', 'registered')
            ->firstOrFail();

        $registration->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Désinscription enregistrée.']);
    }

    /**
     * Liste des inscriptions du membre connecté.
     * Filtres : ?upcoming=1 (à venir), ?past=1 (passés).
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        $query = EventRegistration::where('user_id', $request->user()->id)
            ->where('status', '!=', 'cancelled')
            ->with(['event' => fn ($q) => $q->withCount(['registrations' => fn ($r) => $r->where('status', 'registered')])])
            ->orderByDesc('registered_at');

        if ($request->boolean('upcoming')) {
            $query->whereHas('event', fn ($q) => $q->where('starts_at', '>=', now()));
        }
        if ($request->boolean('past')) {
            $query->whereHas('event', fn ($q) => $q->where('starts_at', '<', now()));
        }

        $perPage = min((int) $request->query('per_page', 12), 50);

        return EventRegistrationResource::collection($query->paginate($perPage));
    }
}
