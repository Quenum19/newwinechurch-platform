<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Série d'événements (Phase 5 billetterie).
 *
 * Regroupe N events (occurrences) liés par le même thème.
 * Métadonnées partagées : titre, description, cover, lieu par défaut.
 * Génération auto via recurrence_type + recurrence_day + N occurrences.
 */
class EventSeries extends Model
{
    use HasFactory, \App\Models\Concerns\HasBilingualFields;

    protected $table = 'event_series';

    protected array $bilingualFields = ['title', 'description'];

    protected $fillable = [
        'title', 'title_en', 'slug', 'description', 'description_en', 'cover_image',
        'recurrence_type', 'recurrence_day',
        'default_start_time', 'default_duration_minutes',
        'default_location', 'default_address',
        'is_published', 'created_by',
    ];

    protected $casts = [
        'is_published'             => 'boolean',
        'recurrence_day'           => 'integer',
        'default_duration_minutes' => 'integer',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'series_id')
            ->orderBy('starts_at');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    /** Compteurs agrégés sur les occurrences de la série. */
    public function getEventsCountAttribute(): int
    {
        return $this->events()->count();
    }

    public function getUpcomingEventsCountAttribute(): int
    {
        return $this->events()->where('starts_at', '>=', now())->count();
    }

    public function getNextEventAttribute(): ?Event
    {
        return $this->events()->where('starts_at', '>=', now())->first();
    }
}
