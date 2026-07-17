<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

/**
 * Modèle Sermon — message audio/vidéo prêché.
 */
class Sermon extends Model
{
    use HasFactory, HasSlug, SoftDeletes, \App\Models\Concerns\HasBilingualFields;

    protected array $bilingualFields = ['title', 'description'];

    protected $fillable = [
        'title', 'title_en', 'slug', 'description', 'description_en',
        'speaker_id', 'external_speaker_name',
        'series_id', 'scripture_reference', 'sermon_date', 'type',
        'video_url', 'audio_url', 'youtube_url', 'thumbnail',
        'duration_seconds', 'views_count',
        'is_featured', 'is_published', 'published_at',
    ];

    protected $casts = [
        'sermon_date'      => 'date',
        'published_at'     => 'datetime',
        'duration_seconds' => 'integer',
        'views_count'      => 'integer',
        'is_featured'      => 'boolean',
        'is_published'     => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function speaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'speaker_id');
    }

    public function series(): BelongsTo
    {
        return $this->belongsTo(SermonSeries::class, 'series_id');
    }

    public function themes(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            SermonTheme::class,
            'sermon_theme_sermon',
            'sermon_id',
            'theme_id',
        )->orderBy('sort_order')->withTimestamps();
    }

    /** Sermons effectivement visibles publiquement. */
    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true)
                 ->where(function ($q) {
                     $q->whereNull('published_at')
                       ->orWhere('published_at', '<=', now());
                 });
    }

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where('is_featured', true);
    }

    /** Tri par date de prédication décroissante. */
    public function scopeRecent(Builder $q): Builder
    {
        return $q->orderByDesc('sermon_date');
    }

    /** Incrémente le compteur de vues sans déclencher d'event. */
    public function recordView(): void
    {
        $this->increment('views_count');
    }
}
