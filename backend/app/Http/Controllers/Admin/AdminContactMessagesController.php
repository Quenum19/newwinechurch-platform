<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin — Messages de contact reçus depuis le formulaire public.
 *
 * Endpoints :
 *   GET    /admin/contact-messages           liste paginée + filtres
 *   GET    /admin/contact-messages/stats     compteurs (total, non lus, répondus)
 *   GET    /admin/contact-messages/{id}      détail
 *   POST   /admin/contact-messages/{id}/read       marque lu
 *   POST   /admin/contact-messages/{id}/unread     marque non lu
 *   POST   /admin/contact-messages/{id}/replied    marque répondu (replied_at=now)
 *   DELETE /admin/contact-messages/{id}      suppression
 */
class AdminContactMessagesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        $q = ContactMessage::query()->latest();

        if ($request->has('is_read')) {
            $q->where('is_read', $request->boolean('is_read'));
        }
        if ($request->boolean('unreplied')) {
            $q->whereNull('replied_at');
        }
        if ($search = $request->query('search')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            });
        }

        return response()->json($q->paginate($perPage));
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'total'     => ContactMessage::count(),
            'unread'    => ContactMessage::where('is_read', false)->count(),
            'unreplied' => ContactMessage::whereNull('replied_at')->count(),
            'today'     => ContactMessage::whereDate('created_at', today())->count(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $m = ContactMessage::findOrFail($id);
        // Marque comme lu à l'ouverture (idempotent)
        if (! $m->is_read) {
            $m->is_read = true;
            $m->save();
        }
        return response()->json($m);
    }

    public function markRead(int $id): JsonResponse
    {
        $m = ContactMessage::findOrFail($id);
        $m->is_read = true;
        $m->save();
        return response()->json(['message' => 'Marqué lu.', 'data' => $m]);
    }

    public function markUnread(int $id): JsonResponse
    {
        $m = ContactMessage::findOrFail($id);
        $m->is_read = false;
        $m->save();
        return response()->json(['message' => 'Marqué non lu.', 'data' => $m]);
    }

    public function markReplied(int $id): JsonResponse
    {
        $m = ContactMessage::findOrFail($id);
        $m->replied_at = now();
        $m->is_read = true;
        $m->save();
        return response()->json(['message' => 'Marqué répondu.', 'data' => $m]);
    }

    public function destroy(int $id): JsonResponse
    {
        $m = ContactMessage::findOrFail($id);
        $m->delete();
        return response()->json(['message' => 'Message supprimé.']);
    }
}
