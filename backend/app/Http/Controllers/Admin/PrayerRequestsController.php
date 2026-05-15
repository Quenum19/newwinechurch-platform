<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrayerRequestResource;
use App\Models\PrayerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Admin → Demandes de prière (modération).
 *
 *   - Liste avec filtres (catégorie, anonyme, publié, exhaussé, date)
 *   - Publication sur le mur public (is_published toggle)
 *   - Marquer "exhaussé" (is_answered) — utilisé pour les témoignages
 *   - Note admin (privée) pour suivi pastoral
 */
class PrayerRequestsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('view prayer requests')) abort(403);

        $perPage = min((int) $request->query('per_page', 30), 100);

        $query = PrayerRequest::query()->with('user:id,name,first_name,email');

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }
        if ($request->has('published')) {
            $query->where('is_published', $request->boolean('published'));
        }
        if ($request->has('answered')) {
            $query->where('is_answered', $request->boolean('answered'));
        }
        if ($request->has('anonymous')) {
            $query->where('is_anonymous', $request->boolean('anonymous'));
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('request', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $query->orderByDesc('created_at');
        $paginated = $query->paginate($perPage);

        // Annoter chaque item avec le display_name (anonyme ou nom).
        $paginated->getCollection()->transform(function ($p) {
            $p->display_name_admin = $p->display_name; // accès admin = nom réel sauf si is_anonymous
            return $p;
        });

        return response()->json($paginated);
    }

    public function show(int $id): JsonResponse
    {
        if (! request()->user()->can('view prayer requests')) abort(403);

        $prayer = PrayerRequest::with('user')->findOrFail($id);
        return response()->json([
            'id'              => $prayer->id,
            'name'            => $prayer->name,
            'email'           => $prayer->email,
            'request'         => $prayer->request,
            'category'        => $prayer->category,
            'is_anonymous'    => $prayer->is_anonymous,
            'is_answered'     => $prayer->is_answered,
            'is_published'    => $prayer->is_published,
            'prayed_by_count' => $prayer->prayed_by_count,
            'admin_note'      => $prayer->admin_note,
            'display_name'    => $prayer->display_name,
            'created_at'      => $prayer->created_at?->toIso8601String(),
            'user'            => $prayer->user ? [
                'id'        => $prayer->user->id,
                'full_name' => $prayer->user->full_name,
                'email'     => $prayer->user->email,
            ] : null,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage prayer requests')) abort(403);

        $data = $request->validate([
            'is_published' => ['nullable', 'boolean'],
            'is_answered'  => ['nullable', 'boolean'],
            'admin_note'   => ['nullable', 'string', 'max:5000'],
            'category'     => ['nullable', 'in:health,family,work,finance,spiritual,other'],
        ]);

        if (isset($data['admin_note'])) {
            $data['admin_note'] = strip_tags($data['admin_note']);
        }

        $prayer = PrayerRequest::findOrFail($id);
        $prayer->update($data);

        return response()->json(['message' => 'Demande mise à jour.', 'data' => $prayer->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('manage prayer requests')) abort(403);
        PrayerRequest::findOrFail($id)->delete();
        return response()->json(['message' => 'Demande supprimée.']);
    }

    /** Bascule rapide de publication. */
    public function togglePublish(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('publish prayers')) abort(403);
        $prayer = PrayerRequest::findOrFail($id);
        $prayer->update(['is_published' => ! $prayer->is_published]);
        return response()->json([
            'message' => $prayer->is_published ? 'Publié sur le mur.' : 'Retiré du mur.',
        ]);
    }
}
