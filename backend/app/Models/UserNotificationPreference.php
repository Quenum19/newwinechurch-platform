<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ligne de préférence notification pour un user.
 *
 * (user_id, notification_key) : la valeur `enabled` détermine si l'utilisateur
 * reçoit ce type de notification. Les notifications critiques (`critical` dans
 * config('notifications.preferences')) ignorent cette table.
 */
class UserNotificationPreference extends Model
{
    protected $fillable = [
        'user_id', 'notification_key', 'enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Un user a-t-il activé une préférence ? Défaut = true (opt-out).
     * Les notifs critiques renvoient TOUJOURS true.
     */
    public static function isEnabledFor(User $user, string $key): bool
    {
        $meta = config("notifications.preferences.$key");
        if (($meta['critical'] ?? false) === true) return true;

        $row = static::where('user_id', $user->id)
                     ->where('notification_key', $key)
                     ->first();
        // Défaut = true si pas de ligne (opt-out, pas opt-in).
        return $row?->enabled ?? true;
    }
}
