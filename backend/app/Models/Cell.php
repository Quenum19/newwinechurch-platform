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
 * Modèle Cell — une cellule d'évangélisation de quartier.
 *
 * Refonte Étape 1 :
 *  - leader_id reste comme cache du leader principal courant.
 *  - meeting_day passe en ENUM (validation contrainte DB).
 *  - Ajout target_size, whatsapp_link, is_active.
 *  - Relations vers cellLeaders (historique), attendances.
 */
class Cell extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'description', 'leader_id',
        'zone', 'meeting_day', 'meeting_time', 'meeting_location',
        'target_size', 'whatsapp_link', 'status', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'target_size' => 'integer',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    // === RELATIONS ===

    /** Leader principal courant (cache). */
    public function leader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'leader_id');
    }

    /** Historique complet des leaders. */
    public function leaders(): HasMany
    {
        return $this->hasMany(CellLeader::class);
    }

    /** Leaders encore en poste. */
    public function activeLeaders(): HasMany
    {
        return $this->hasMany(CellLeader::class)->whereNull('ended_at');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'cell_user')
                    ->withPivot('role', 'joined_at', 'is_convert')
                    ->withTimestamps();
    }

    public function reports(): HasMany
    {
        return $this->hasMany(CellReport::class);
    }

    /** Présences enregistrées dans cette cellule. */
    public function attendances(): HasMany
    {
        return $this->hasMany(CellAttendance::class);
    }

    // === SCOPES ===

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('status', 'active')->where('is_active', true);
    }

    public function scopeForZone(Builder $q, string $zone): Builder
    {
        return $q->where('zone', $zone);
    }
}
