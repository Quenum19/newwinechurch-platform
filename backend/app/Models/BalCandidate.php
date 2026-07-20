<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Candidat au vote Roi ou Reine du Bal 2026.
 *
 * Chaque candidat a un rôle (roi | reine), une photo optionnelle
 * et un ordre d'affichage sur la page de vote.
 */
class BalCandidate extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'role',
        'first_name',
        'last_name',
        'photo_path',
        'display_order',
        'is_active',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'display_order' => 'integer',
    ];

    protected $appends = ['photo_url', 'full_name'];

    /** Event auquel appartient ce candidat. */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** Votes reçus en tant que Roi. */
    public function votesAsRoi(): HasMany
    {
        return $this->hasMany(BalVote::class, 'roi_candidate_id');
    }

    /** Votes reçus en tant que Reine. */
    public function votesAsReine(): HasMany
    {
        return $this->hasMany(BalVote::class, 'reine_candidate_id');
    }

    /** URL absolue de la photo (ou null si aucune). */
    public function getPhotoUrlAttribute(): ?string
    {
        if (empty($this->photo_path)) {
            return null;
        }

        // Si déjà un URL absolu, on le renvoie tel quel.
        if (str_starts_with($this->photo_path, 'http')) {
            return $this->photo_path;
        }

        return asset('storage/'.ltrim($this->photo_path, '/'));
    }

    /** Nom complet formaté pour affichage. */
    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }
}
