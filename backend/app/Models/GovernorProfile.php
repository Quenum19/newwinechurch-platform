<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Profil enrichi d'un gouverneur (lien 1-1 avec User).
 *
 * Stocke les éléments qui n'ont de sens que pour un gouverneur :
 * photo officielle, bannière, vision, ligne directe. Permet d'avoir
 * une présentation soignée sur la page publique du département sans
 * polluer le modèle User.
 */
class GovernorProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'photo_profile', 'banner_image', 'bio',
        'phone_direct', 'years_in_role', 'vision_statement',
    ];

    protected $casts = [
        'years_in_role' => 'integer',
    ];

    // === RELATIONS ===

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // === ACCESSEURS (URL publiques) ===

    /** URL absolue de la photo de profil. */
    public function getPhotoProfileUrlAttribute(): ?string
    {
        return $this->absoluteUrl($this->photo_profile);
    }

    /** URL absolue de la bannière. */
    public function getBannerImageUrlAttribute(): ?string
    {
        return $this->absoluteUrl($this->banner_image);
    }

    /** Convertit un chemin relatif storage/ en URL publique complète. */
    protected function absoluteUrl(?string $path): ?string
    {
        if (! $path) return null;
        if (str_starts_with($path, 'http')) return $path;
        return asset('storage/'.ltrim($path, '/'));
    }
}
