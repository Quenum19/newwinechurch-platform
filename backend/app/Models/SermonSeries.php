<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

/**
 * Modèle SermonSeries — série thématique regroupant plusieurs sermons.
 */
class SermonSeries extends Model
{
    use HasFactory, HasSlug;

    protected $table = 'sermon_series';

    protected $fillable = [
        'title', 'slug', 'description', 'cover_image',
        'started_at', 'ended_at', 'is_active',
    ];

    protected $casts = [
        'started_at' => 'date',
        'ended_at'   => 'date',
        'is_active'  => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function sermons(): HasMany
    {
        return $this->hasMany(Sermon::class, 'series_id');
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }
}
