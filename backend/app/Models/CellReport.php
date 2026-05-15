<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle CellReport — rapport hebdomadaire d'une cellule (refonte Étape 1).
 *
 * Structure restructurée :
 *  - leader_id (anciennement reported_by)
 *  - attendance_count (anciennement attendees_count)
 *  - new_members (anciennement new_converts)
 *  - prayer_requests / activities : JSON structuré
 *  - highlights : témoignages + faits marquants (fusion testimony)
 *  - needs_followup : flag de suivi nécessaire
 *
 * Workflow : draft → submitted → reviewed.
 */
class CellReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'cell_id', 'leader_id', 'week_start', 'week_end',
        'attendance_count', 'new_members',
        'prayer_requests', 'activities', 'challenges', 'highlights',
        'needs_followup', 'status',
        'submitted_at', 'reviewed_by', 'reviewed_at', 'review_comment',
        'pdf_path', 'pdf_generated_at',
    ];

    protected $casts = [
        'week_start'       => 'date',
        'week_end'         => 'date',
        'attendance_count' => 'integer',
        'new_members'      => 'integer',
        'prayer_requests'  => 'array',
        'activities'       => 'array',
        'needs_followup'   => 'boolean',
        'submitted_at'     => 'datetime',
        'reviewed_at'      => 'datetime',
        'pdf_generated_at' => 'datetime',
    ];

    // === RELATIONS ===

    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'leader_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function notifications(): MorphMany
    {
        return $this->morphMany(ReportNotification::class, 'report_notifiable');
    }

    // === SCOPES ===

    public function scopeSubmitted(Builder $q): Builder
    {
        return $q->where('status', 'submitted');
    }

    public function scopeForCell(Builder $q, int $cellId): Builder
    {
        return $q->where('cell_id', $cellId);
    }

    public function scopeForPeriod(Builder $q, string $start, string $end): Builder
    {
        return $q->where('week_start', '>=', $start)
                 ->where('week_end',   '<=', $end);
    }

    public function scopeNeedingFollowup(Builder $q): Builder
    {
        return $q->where('needs_followup', true);
    }

    // === HELPERS ===

    /**
     * Taux de présence du rapport (en %).
     * attendance_count / nombre de membres actifs de la cellule × 100.
     */
    public function attendanceRate(): float
    {
        $total = $this->cell?->members()->count() ?? 0;
        if ($total === 0) return 0.0;
        return round(($this->attendance_count / $total) * 100, 1);
    }

    /** Indique si le rapport a été soumis en retard (>7j après la fin de semaine). */
    public function isLate(): bool
    {
        if (! $this->submitted_at || ! $this->week_end) return false;
        return $this->submitted_at->gt($this->week_end->copy()->addDays(7));
    }
}
