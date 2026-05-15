<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle PrayerRequest — demande de prière soumise par un membre ou visiteur.
 */
class PrayerRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'email', 'request', 'category',
        'is_anonymous', 'is_answered', 'is_published',
        'prayed_by_count', 'admin_note',
    ];

    protected $casts = [
        'is_anonymous'    => 'boolean',
        'is_answered'     => 'boolean',
        'is_published'    => 'boolean',
        'prayed_by_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Demandes publiées sur le mur de prière communautaire. */
    public function scopePublic(Builder $q): Builder
    {
        return $q->where('is_published', true)->orderByDesc('created_at');
    }

    /**
     * Nom à afficher publiquement : "Anonyme" si flag, sinon le nom fourni
     * ou le prénom du user connecté.
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->is_anonymous) return 'Anonyme';
        if ($this->name) return $this->name;
        if ($this->user) return $this->user->first_name ?: $this->user->name;
        return 'Anonyme';
    }
}
