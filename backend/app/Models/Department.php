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
 * Modèle Department — l'un des 50 départements/ministères de l'église.
 *
 * Refonte Étape 1 :
 *  - captain_id renommé en governor_id (cache du gouverneur principal courant).
 *  - Ajout banner_image, profile_photo, color_theme, vision, sort_order,
 *    founded_at, member_count_cache, is_active.
 *  - Relations vers governors (historique), reports, media.
 */
class Department extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'name', 'name_en', 'slug', 'description', 'description_en',
        'vision', 'icon', 'color', 'color_theme',
        'banner_image', 'profile_photo',
        'governor_id', 'status', 'is_active',
        'display_order', 'sort_order', 'founded_at', 'member_count_cache',
    ];

    protected $appends = ['display_name', 'display_description'];

    /**
     * Accessor — retourne name_en si la locale est 'en' et que la traduction
     * existe, sinon fallback sur name (FR). Pratique pour l'API publique.
     */
    public function getDisplayNameAttribute(): string
    {
        if (app()->getLocale() === 'en' && ! empty($this->name_en)) {
            return $this->name_en;
        }
        return $this->name ?? '';
    }

    public function getDisplayDescriptionAttribute(): ?string
    {
        if (app()->getLocale() === 'en' && ! empty($this->description_en)) {
            return $this->description_en;
        }
        return $this->description;
    }

    protected $casts = [
        'is_active'          => 'boolean',
        'display_order'      => 'integer',
        'sort_order'         => 'integer',
        'founded_at'         => 'date',
        'member_count_cache' => 'integer',
    ];

    /** Génération automatique du slug à partir du nom. */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();
    }

    // === RELATIONS ===

    /** Gouverneur principal courant (cache). */
    public function governor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'governor_id');
    }

    /** Historique complet des gouverneurs. */
    public function governors(): HasMany
    {
        return $this->hasMany(DepartmentGovernor::class);
    }

    /** Gouverneurs encore en poste (ended_at null). */
    public function activeGovernors(): HasMany
    {
        return $this->hasMany(DepartmentGovernor::class)->whereNull('ended_at');
    }

    /** Membres du département (pivot). */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'department_user')
                    ->withPivot('role', 'joined_at')
                    ->withTimestamps();
    }

    /** Rapports soumis pour ce département. */
    public function reports(): HasMany
    {
        return $this->hasMany(DepartmentReport::class);
    }

    /** Templates de rapport (historique de versions). */
    public function reportTemplates(): HasMany
    {
        return $this->hasMany(DepartmentReportTemplate::class);
    }

    /** Template actif courant (utilisé par le rapport en cours). */
    public function activeReportTemplate(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DepartmentReportTemplate::class)
                    ->where('is_active', true)
                    ->latestOfMany('version');
    }

    /** Médias dédiés (table department_media — Étape 1). */
    public function media(): HasMany
    {
        return $this->hasMany(DepartmentMedia::class);
    }

    /** Médias rattachés depuis la galerie publique générale (Étape 5). */
    public function galleryMedia(): HasMany
    {
        return $this->hasMany(MediaGallery::class);
    }

    /** Événements liés (pivot event_department, Étape 5). */
    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_department')->withTimestamps();
    }

    // === ACCESSEURS ===

    /** URL absolue de la bannière. */
    public function getBannerImageUrlAttribute(): ?string
    {
        return $this->absoluteUrl($this->banner_image);
    }

    /** URL absolue de la photo de profil. */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        return $this->absoluteUrl($this->profile_photo);
    }

    protected function absoluteUrl(?string $path): ?string
    {
        if (! $path) return null;
        if (str_starts_with($path, 'http')) return $path;
        return asset('storage/'.ltrim($path, '/'));
    }

    // === SCOPES ===

    /** Scope : départements actifs uniquement (visibles publiquement). */
    public function scopeActive(Builder $q): Builder
    {
        return $q->where('status', 'active')->where('is_active', true);
    }

    /** Scope : tri canonique (sort_order, puis display_order legacy, puis nom). */
    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy('sort_order')->orderBy('display_order')->orderBy('name');
    }
}
