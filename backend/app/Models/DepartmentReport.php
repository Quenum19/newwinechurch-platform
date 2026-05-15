<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Rapport périodique soumis par un gouverneur pour son département.
 *
 * Cycle de vie : draft → submitted → reviewed → approved / rejected.
 * form_data est un JSON variable selon le template de département (vision
 * pour gestion par sous-équipes : DRH, Finance, etc.).
 */
class DepartmentReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'department_id', 'governor_id', 'report_type',
        'period_start', 'period_end', 'form_data', 'status',
        'submitted_at', 'reviewed_by', 'reviewed_at', 'review_comment',
        'pdf_path', 'pdf_generated_at',
    ];

    protected $casts = [
        'form_data'        => 'array',
        'period_start'     => 'date',
        'period_end'       => 'date',
        'submitted_at'     => 'datetime',
        'reviewed_at'      => 'datetime',
        'pdf_generated_at' => 'datetime',
    ];

    // === RELATIONS ===

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function governor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'governor_id');
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

    public function scopeForDepartment(Builder $q, int $departmentId): Builder
    {
        return $q->where('department_id', $departmentId);
    }

    public function scopeForPeriod(Builder $q, string $start, string $end): Builder
    {
        return $q->where('period_start', '>=', $start)
                 ->where('period_end',   '<=', $end);
    }

    // === HELPERS ===

    /**
     * Indique si le rapport a été soumis en retard.
     * Convention : un rapport est en retard si soumis plus de 7 jours
     * après la fin de la période couverte.
     */
    public function isLate(): bool
    {
        if (! $this->submitted_at || ! $this->period_end) {
            return false;
        }
        return $this->submitted_at->gt($this->period_end->copy()->addDays(7));
    }
}
