<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Log d'envoi de notification suite à un rapport (dept ou cell).
 *
 * Polymorphique : report_notifiable peut pointer vers DepartmentReport
 * ou CellReport. Permet audit complet : qui a été notifié, par quel canal,
 * statut, erreur éventuelle.
 *
 * Pas de softDelete : c'est un log technique, on garde ou on supprime.
 */
class ReportNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_notifiable_id', 'report_notifiable_type',
        'recipient_id', 'channel', 'status', 'sent_at', 'error_message',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    // === RELATIONS ===

    public function reportNotifiable(): MorphTo
    {
        return $this->morphTo();
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    // === SCOPES ===

    public function scopePending(Builder $q): Builder
    {
        return $q->where('status', 'pending');
    }

    public function scopeFailed(Builder $q): Builder
    {
        return $q->where('status', 'failed');
    }

    public function scopeOnChannel(Builder $q, string $channel): Builder
    {
        return $q->where('channel', $channel);
    }
}
