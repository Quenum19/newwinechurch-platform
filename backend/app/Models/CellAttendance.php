<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Présence d'un membre à une réunion de cellule.
 *
 * Une ligne par (cellule, membre, date). Volumétrie ~3M lignes/an :
 * toutes les requêtes doivent passer par les index composés définis
 * dans la migration.
 */
class CellAttendance extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'cell_attendance';

    protected $fillable = [
        'cell_id', 'member_id', 'meeting_date',
        'is_present', 'arrived_late', 'note', 'recorded_by',
    ];

    protected $casts = [
        'meeting_date' => 'date',
        'is_present'   => 'boolean',
        'arrived_late' => 'boolean',
    ];

    // === RELATIONS ===

    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    // === SCOPES ===

    public function scopePresent(Builder $q): Builder
    {
        return $q->where('is_present', true);
    }

    public function scopeForCell(Builder $q, int $cellId): Builder
    {
        return $q->where('cell_id', $cellId);
    }

    public function scopeForPeriod(Builder $q, string $start, string $end): Builder
    {
        return $q->whereBetween('meeting_date', [$start, $end]);
    }
}
