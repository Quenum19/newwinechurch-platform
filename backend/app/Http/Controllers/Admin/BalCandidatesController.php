<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BalCandidate;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * CRUD des candidats Roi & Reine du Bal 2026.
 *
 * Sécurité : requiert la permission `manage event tickets`.
 * Photos : stockées dans storage/app/public/bal-candidates/ (image ≤ 2MB).
 */
class BalCandidatesController extends Controller
{
    /** Vérifie que l'utilisateur a la permission billetterie. */
    private function ensureAuthorized(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }
        if (! $user->can('manage event tickets')) {
            abort(response()->json([
                'message' => "Accès refusé : gestion des candidats réservée à l'équipe billetterie.",
            ], 403));
        }
    }

    /** GET /admin/events/{id}/bal/candidates — liste triée. */
    public function index(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);
        Event::findOrFail($eventId);

        $items = BalCandidate::where('event_id', $eventId)
            ->orderBy('role')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return response()->json(['candidates' => $items]);
    }

    /** POST /admin/events/{id}/bal/candidates — création avec upload photo. */
    public function store(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);
        Event::findOrFail($eventId);

        $data = $request->validate([
            'role'          => ['required', Rule::in(['roi', 'reine'])],
            'first_name'    => ['required', 'string', 'max:80'],
            'last_name'     => ['required', 'string', 'max:80'],
            'photo'         => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_active'     => ['nullable', 'boolean'],
        ]);

        $candidate = new BalCandidate([
            'event_id'      => $eventId,
            'role'          => $data['role'],
            'first_name'    => $data['first_name'],
            'last_name'     => $data['last_name'],
            'display_order' => $data['display_order'] ?? 0,
            'is_active'     => $data['is_active'] ?? true,
        ]);

        if ($request->hasFile('photo')) {
            $candidate->photo_path = $request->file('photo')
                ->store('bal-candidates', 'public');
        }

        $candidate->save();

        return response()->json([
            'message'   => 'Candidat créé.',
            'candidate' => $candidate->fresh(),
        ], 201);
    }

    /** PUT /admin/events/{id}/bal/candidates/{cid} — mise à jour. */
    public function update(Request $request, int $eventId, int $cid): JsonResponse
    {
        $this->ensureAuthorized($request);

        $candidate = BalCandidate::where('event_id', $eventId)->findOrFail($cid);

        $data = $request->validate([
            'role'          => ['sometimes', 'required', Rule::in(['roi', 'reine'])],
            'first_name'    => ['sometimes', 'required', 'string', 'max:80'],
            'last_name'     => ['sometimes', 'required', 'string', 'max:80'],
            'photo'         => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        // Nouvelle photo → supprimer l'ancienne.
        if ($request->hasFile('photo')) {
            if ($candidate->photo_path && Storage::disk('public')->exists($candidate->photo_path)) {
                Storage::disk('public')->delete($candidate->photo_path);
            }
            $candidate->photo_path = $request->file('photo')
                ->store('bal-candidates', 'public');
        }

        $candidate->fill(collect($data)->except('photo')->toArray());
        $candidate->save();

        return response()->json([
            'message'   => 'Candidat mis à jour.',
            'candidate' => $candidate->fresh(),
        ]);
    }

    /** DELETE /admin/events/{id}/bal/candidates/{cid} — suppression + photo. */
    public function destroy(Request $request, int $eventId, int $cid): JsonResponse
    {
        $this->ensureAuthorized($request);

        $candidate = BalCandidate::where('event_id', $eventId)->findOrFail($cid);

        if ($candidate->photo_path && Storage::disk('public')->exists($candidate->photo_path)) {
            Storage::disk('public')->delete($candidate->photo_path);
        }

        $candidate->delete();

        return response()->json(['message' => 'Candidat supprimé.']);
    }

    /** POST /admin/events/{id}/bal/candidates/reorder — reorder en masse. */
    public function reorder(Request $request, int $eventId): JsonResponse
    {
        $this->ensureAuthorized($request);

        $data = $request->validate([
            'items'                 => ['required', 'array', 'min:1'],
            'items.*.id'            => ['required', 'integer', 'exists:bal_candidates,id'],
            'items.*.display_order' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($data['items'] as $item) {
            BalCandidate::where('event_id', $eventId)
                ->where('id', $item['id'])
                ->update(['display_order' => $item['display_order']]);
        }

        return response()->json(['message' => 'Ordre mis à jour.']);
    }
}
