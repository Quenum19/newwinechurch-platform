<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Modèle Donation — don Mobile Money / cash.
 *
 * Le workflow déclaratif (cf charte projet) :
 *   created → status=pending  (donateur a soumis sa référence)
 *   admin valide la référence → confirmed_at + status=completed
 */
class Donation extends Model
{
    use HasFactory, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['amount', 'method', 'reference', 'type', 'status', 'confirmed_by'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn ($event) => "Don {$event}");
    }

    protected $fillable = [
        'user_id', 'amount', 'currency', 'method', 'reference',
        'type', 'status',
        'donor_name', 'donor_phone', 'note',
        'confirmed_at', 'confirmed_by',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function scopePending(Builder $q): Builder
    {
        return $q->where('status', 'pending');
    }

    public function scopeCompleted(Builder $q): Builder
    {
        return $q->where('status', 'completed');
    }

    /** Statistique : montant total des dons confirmés sur une période. */
    public static function totalCompleted(?\DateTimeInterface $from = null, ?\DateTimeInterface $to = null): float
    {
        $q = self::completed();
        if ($from) $q->where('created_at', '>=', $from);
        if ($to)   $q->where('created_at', '<=', $to);
        return (float) $q->sum('amount');
    }
}
