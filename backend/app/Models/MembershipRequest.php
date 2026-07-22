<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Demande d'adhésion à NWC.
 *
 * Workflow :
 *  - Visiteur soumet via /rejoindre (status='pending')
 *  - RH/admin voit dans /admin/demandes-adhesion
 *  - Approve  → crée un User avec mot de passe par défaut ('password') +
 *               must_change_password=true. Envoie email avec credentials.
 *  - Reject   → status='rejected' + raison facultative.
 */
class MembershipRequest extends Model
{
    protected $fillable = [
        'first_name', 'name', 'email', 'phone', 'birth_date',
        'gender', 'city', 'referrer', 'motivation',
        'source', 'enrollment_type', 'interested_department_id',
        'event_id', 'enrollment_status', 'admin_notes',
        'status', 'processed_by', 'processed_at', 'rejection_reason', 'user_id',
    ];

    protected $casts = [
        'birth_date'   => 'date',
        'processed_at' => 'datetime',
    ];

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function interestedDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'interested_department_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function scopeEnrollments(Builder $q): Builder
    {
        return $q->whereNotNull('enrollment_type');
    }

    public function scopeForEvent(Builder $q, int $eventId): Builder
    {
        return $q->where('event_id', $eventId);
    }

    public function scopePending(Builder $q): Builder
    {
        return $q->where('status', 'pending');
    }

    public function getFullNameAttribute(): string
    {
        return trim(($this->first_name ?? '').' '.($this->name ?? ''));
    }
}
