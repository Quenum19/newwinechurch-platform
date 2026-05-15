<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Historique des gouverneurs d'un département.
 *
 * Une ligne = un mandat (potentiellement encore actif si ended_at is null).
 * is_primary distingue le gouverneur principal courant des adjoints/anciens.
 */
class DepartmentGovernor extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'department_id', 'is_primary',
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

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function appointer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'appointed_by');
    }

    // === SCOPES ===

    /** Mandats actifs (ended_at null = encore en poste). */
    public function scopeActive(Builder $q): Builder
    {
        return $q->whereNull('ended_at');
    }

    /** Gouverneur principal uniquement. */
    public function scopePrimary(Builder $q): Builder
    {
        return $q->where('is_primary', true);
    }

    public function scopeForDepartment(Builder $q, int $departmentId): Builder
    {
        return $q->where('department_id', $departmentId);
    }
}
