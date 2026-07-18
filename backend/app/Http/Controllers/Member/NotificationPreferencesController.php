<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sprint B — Endpoints préférences notification par utilisateur.
 *
 *  GET  /api/me/notification-preferences  → liste des préférences + état
 *  POST /api/me/notification-preferences  → upsert (bulk) des toggles
 *
 * Les clés sont définies dans config('notifications.preferences').
 * Les entrées `critical: true` ne sont PAS opt-outables (superadmin, sécurité).
 */
class NotificationPreferencesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $catalog = config('notifications.preferences', []);

        $existing = UserNotificationPreference::where('user_id', $user->id)
            ->get()
            ->keyBy('notification_key');

        $data = [];
        foreach ($catalog as $key => $meta) {
            $row = $existing->get($key);
            $data[] = [
                'key'      => $key,
                'label'    => $meta['label'] ?? $key,
                'critical' => (bool) ($meta['critical'] ?? false),
                'enabled'  => (bool) ($meta['critical'] ?? false)
                    ? true               // critique : forcé activé
                    : ($row?->enabled ?? true), // défaut = activé (opt-out)
            ];
        }

        return response()->json(['data' => $data]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $catalog = config('notifications.preferences', []);

        $data = $request->validate([
            'preferences'                   => ['required', 'array'],
            'preferences.*.key'             => ['required', 'string', 'max:60'],
            'preferences.*.enabled'         => ['required', 'boolean'],
        ]);

        foreach ($data['preferences'] as $pref) {
            $key = $pref['key'];
            if (! isset($catalog[$key])) continue; // ignore clés inconnues
            if (($catalog[$key]['critical'] ?? false) === true) continue; // non modifiable

            UserNotificationPreference::updateOrCreate(
                ['user_id' => $user->id, 'notification_key' => $key],
                ['enabled' => (bool) $pref['enabled']],
            );
        }

        return response()->json([
            'message' => 'Préférences enregistrées.',
        ]);
    }
}
