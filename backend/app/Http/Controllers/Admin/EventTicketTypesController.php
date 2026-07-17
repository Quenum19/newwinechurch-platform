<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventTicketType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Phase 2 — CRUD des types de tickets d'un événement (admin).
 *
 *  GET    /api/admin/events/{eventId}/ticket-types
 *  POST   /api/admin/events/{eventId}/ticket-types
 *  PUT    /api/admin/events/{eventId}/ticket-types/{id}
 *  DELETE /api/admin/events/{eventId}/ticket-types/{id}
 *
 * Permission requise : 'manage event tickets'.
 */
class EventTicketTypesController extends Controller
{
    public function index(Request $request, int $eventId): JsonResponse
    {
        // Étape F — Autoriser aussi les managers scopés sur cet event.
        $event = Event::findOrFail($eventId);
        $user = $request->user();
        $allowed = $user->can('manage event tickets') || $event->userCanManage($user);
        if (! $allowed) abort(403);

        $types = $event->ticketTypes()->get()->map(function ($t) {
            $arr = $t->toArray();
            $arr['sold']      = $t->sold;
            $arr['remaining'] = $t->remaining;
            return $arr;
        });

        return response()->json(['data' => $types]);
    }

    public function store(Request $request, int $eventId): JsonResponse
    {
        // Étape F — Autoriser aussi les managers scopés sur cet event.
        $event = Event::findOrFail($eventId);
        $user = $request->user();
        $allowed = $user->can('manage event tickets') || $event->userCanManage($user);
        if (! $allowed) abort(403);

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'description'   => ['nullable', 'string', 'max:500'],
            'price_fcfa'    => ['required', 'integer', 'min:0', 'max:10000000'],
            'capacity'      => ['nullable', 'integer', 'min:1'],
            'max_per_order' => ['nullable', 'integer', 'min:1', 'max:20'],
            'sort_order'    => ['nullable', 'integer'],
            'color_hex'     => ['nullable', 'string', 'size:7'],
            'is_active'     => ['nullable', 'boolean'],
        ]);

        // Slug auto unique par event
        $base = Str::slug($data['name']);
        $slug = $base;
        $i = 1;
        while ($event->ticketTypes()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . (++$i);
        }
        $data['slug']      = $slug;
        $data['event_id']  = $event->id;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['sort_order']= $data['sort_order'] ?? ($event->ticketTypes()->max('sort_order') ?? 0) + 1;

        $type = EventTicketType::create($data);
        return response()->json(['data' => $type, 'message' => 'Type créé.'], 201);
    }

    public function update(Request $request, int $eventId, int $id): JsonResponse
    {
        // Étape F — Autoriser aussi les managers scopés sur cet event.
        $event = Event::findOrFail($eventId);
        $user = $request->user();
        $allowed = $user->can('manage event tickets') || $event->userCanManage($user);
        if (! $allowed) abort(403);

        $type = EventTicketType::where('event_id', $eventId)->findOrFail($id);
        $data = $request->validate([
            'name'          => ['sometimes', 'required', 'string', 'max:100'],
            'description'   => ['nullable', 'string', 'max:500'],
            'price_fcfa'    => ['sometimes', 'required', 'integer', 'min:0', 'max:10000000'],
            'capacity'      => ['nullable', 'integer', 'min:1'],
            'max_per_order' => ['nullable', 'integer', 'min:1', 'max:20'],
            'sort_order'    => ['nullable', 'integer'],
            'color_hex'     => ['nullable', 'string', 'size:7'],
            'is_active'     => ['nullable', 'boolean'],
        ]);

        // Si name change, on régénère le slug (en gardant unique).
        if (isset($data['name']) && $data['name'] !== $type->name) {
            $base = Str::slug($data['name']);
            $slug = $base; $i = 1;
            while ($type->event->ticketTypes()->where('slug', $slug)->where('id', '!=', $type->id)->exists()) {
                $slug = $base . '-' . (++$i);
            }
            $data['slug'] = $slug;
        }

        $type->update($data);
        return response()->json(['data' => $type, 'message' => 'Type mis à jour.']);
    }

    public function destroy(Request $request, int $eventId, int $id): JsonResponse
    {
        // Étape F — Autoriser aussi les managers scopés sur cet event.
        $event = Event::findOrFail($eventId);
        $user = $request->user();
        $allowed = $user->can('manage event tickets') || $event->userCanManage($user);
        if (! $allowed) abort(403);

        $type = EventTicketType::where('event_id', $eventId)->findOrFail($id);
        if ($type->tickets()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : des tickets existent déjà pour ce type. Désactive-le plutôt.',
            ], 422);
        }
        $type->delete();
        return response()->json(['message' => 'Type supprimé.']);
    }
}
