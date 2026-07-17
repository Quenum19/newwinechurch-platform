<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Magic-link scanner invité externe — Étape A.
 *
 * Un token = une paire (event, user "invité"). L'invité ouvre le lien sur
 * mobile → auto-loggué (via un guard/token side dans Étape C) → accès
 * uniquement à la page scanner de son event.
 *
 * @property string $token
 * @property string $status  active|suspended|revoked
 * @property \Illuminate\Support\Carbon $expires_at
 */
class GuestScannerToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'user_id', 'token',
        'display_name', 'contact', 'contact_type',
        'status', 'expires_at',
        'created_by_id',
        'last_used_at', 'scan_count', 'last_ip',
    ];

    protected $casts = [
        'expires_at'    => 'datetime',
        'last_used_at'  => 'datetime',
        'scan_count'    => 'integer',
    ];

    protected $hidden = ['token'];

    public const STATUS_ACTIVE    = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_REVOKED   = 'revoked';

    // === RELATIONS ===

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    // === HELPERS ===

    /** Token utilisable maintenant ? */
    public function isValid(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && $this->expires_at !== null
            && $this->expires_at->isFuture();
    }

    /** Génère un token secret 64 chars URL-safe. */
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    // === SCOPES ===

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_ACTIVE)
                 ->where('expires_at', '>', now());
    }
}
