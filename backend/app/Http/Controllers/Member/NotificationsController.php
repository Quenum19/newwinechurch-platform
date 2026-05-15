<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Inbox utilisateur — notifications Laravel (table `notifications`).
 *
 * Endpoints :
 *  GET    /api/notifications           liste paginée curseur
 *  GET    /api/notifications/count     nombre non-lues (badge)
 *  POST   /api/notifications/mark-read tout marquer comme lu
 *  POST   /api/notifications/{id}/mark-read une seule
 *  DELETE /api/notifications/{id}      supprimer
 */
class NotificationsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = $user->notifications()->select(
            'id', 'type', 'data', 'read_at', 'created_at'
        );

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }
        if ($type = $request->query('type')) {
            $query->where('type', 'like', "%{$type}%");
        }

        $perPage = min((int) $request->query('per_page', 20), 100);

        $paginated = $query->orderByDesc('created_at')->cursorPaginate($perPage);

        // Transformation : on déplie le payload data + flatten quelques champs utiles.
        $paginated->getCollection()->transform(function ($n) {
            $data = is_array($n->data) ? $n->data : (json_decode((string) $n->data, true) ?? []);
            return [
                'id'          => $n->id,
                'type'        => class_basename($n->type),
                'class'       => $n->type,
                'data'        => $data,
                'read_at'     => $n->read_at?->toIso8601String(),
                'created_at'  => $n->created_at?->toIso8601String(),
                'is_read'     => $n->read_at !== null,
            ];
        });

        return $paginated;
    }

    public function count(Request $request): JsonResponse
    {
        return response()->json([
            'unread' => (int) $request->user()->unreadNotifications()->count(),
            'total'  => (int) $request->user()->notifications()->count(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'Toutes les notifications marquées comme lues.']);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $n = $request->user()->notifications()->whereKey($id)->first();
        abort_unless($n, 404, 'Notification introuvable.');
        $n->markAsRead();
        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $n = $request->user()->notifications()->whereKey($id)->first();
        abort_unless($n, 404, 'Notification introuvable.');
        $n->delete();
        return response()->json(['message' => 'Notification supprimée.']);
    }
}
