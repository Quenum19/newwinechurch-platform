<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Historique des leaders d'une cellule.
 *
 * Une ligne = un mandat (encore actif si ended_at is null).
 * is_primary = leader principal courant.
 */
class CellLeader extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'cell_id', 'is_primary',
        'appointed_at', 'ended_at', 'appointed_by', 'notes',
    ];

    protected $casts = [
        'is_primary'   => 'boolean',
        'appointed_at' => 'date',
        'ended_at'     => 'date',
    ];

    // === RELATIONS ===

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    public function appointer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'appointed_by');
    }

    // === SCOPES ===

    public function scopeActive(Builder $q): Builder
    {
        return $q->whereNull('ended_at');
    }

    public function scopePrimary(Builder $q): Builder
    {
        return $q->where('is_primary', true);
    }

    public function scopeForCell(Builder $q, int $cellId): Builder
    {
        return $q->where('cell_id', $cellId);
    }
}
