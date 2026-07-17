<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Grant scopé à un événement — Étape A rôles/permissions.
 *
 * Hiérarchie des grants (helpers isAtLeast*) :
 *   manager > scanner_lead > scanner
 *
 * @property int $event_id
 * @property int $user_id
 * @property string $grant
 * @property \Illuminate\Support\Carbon|null $revoked_at
 */
class EventStaff extends Model
{
    use HasFactory;

    protected $table = 'event_staff';

    protected $fillable = [
        'event_id', 'user_id', 'grant',
        'assigned_by_id', 'assigned_at',
        'revoked_at', 'revoked_by_id', 'revoke_reason',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'revoked_at'  => 'datetime',
    ];

    public const GRANT_MANAGER      = 'manager';
    public const GRANT_SCANNER_LEAD = 'scanner_lead';
    public const GRANT_SCANNER      = 'scanner';

    /** Rangs numériques pour comparaison hiérarchique. */
    protected const RANKS = [
        self::GRANT_SCANNER      => 1,
        self::GRANT_SCANNER_LEAD => 2,
        self::GRANT_MANAGER      => 3,
    ];

    // === RELATIONS ===

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_id');
    }

    public function revoker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_id');
    }

    // === HELPERS ===

    /** Grant encore actif (non révoqué) ? */
    public function isActive(): bool
    {
        return $this->revoked_at === null;
    }

    /** Ce grant couvre-t-il au moins le niveau demandé ? */
    public function isAtLeast(string $requiredGrant): bool
    {
        $mine = self::RANKS[$this->grant] ?? 0;
        $need = self::RANKS[$requiredGrant] ?? 0;
        return $mine >= $need;
    }

    // === SCOPES ===

    public function scopeActive(Builder $q): Builder
    {
        return $q->whereNull('revoked_at');
    }

    public function scopeForEvent(Builder $q, int $eventId): Builder
    {
        return $q->where('event_id', $eventId);
    }

    public function scopeGrant(Builder $q, string $grant): Builder
    {
        return $q->where('grant', $grant);
    }
}
