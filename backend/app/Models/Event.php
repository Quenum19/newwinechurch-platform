<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

/**
 * Modèle Event — événement de l'église (culte, prière, formation...).
 */
class Event extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'title', 'slug', 'description', 'type',
        'location', 'address', 'starts_at', 'ends_at',
        'cover_image', 'max_attendees',
        'registration_required', 'registration_deadline',
        'is_online', 'online_link',
        'is_featured', 'is_published', 'created_by',
    ];

    protected $casts = [
        'starts_at'             => 'datetime',
        'ends_at'               => 'datetime',
        'registration_deadline' => 'datetime',
        'max_attendees'         => 'integer',
        'registration_required' => 'boolean',
        'is_online'             => 'boolean',
        'is_featured'           => 'boolean',
        'is_published'          => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    /** Départements rattachés à l'événement (Étape 5). */
    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'event_department')->withTimestamps();
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    /** Événements à venir (publiés). */
    public function scopeUpcoming(Builder $q): Builder
    {
        return $q->published()->where('starts_at', '>=', now()->startOfDay())
                 ->orderBy('starts_at');
    }

    /** Événements passés (publiés). */
    public function scopePast(Builder $q): Builder
    {
        return $q->published()->where('starts_at', '<', now()->startOfDay())
                 ->orderByDesc('starts_at');
    }

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where('is_featured', true);
    }

    /** L'événement accepte-t-il encore des inscriptions ? */
    public function isRegistrationOpen(): bool
    {
        if (! $this->registration_required) return false;
        if ($this->registration_deadline && now()->gt($this->registration_deadline)) return false;
        if ($this->starts_at && now()->gt($this->starts_at)) return false;
        if ($this->max_attendees) {
            $count = $this->registrations()->where('status', 'registered')->count();
            if ($count >= $this->max_attendees) return false;
        }
        return true;
    }
}
