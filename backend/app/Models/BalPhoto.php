<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Photo d'ambiance du Bal — uploadée par les photographes,
 * affichée sur la slide "ambiance" de l'écran live.
 *
 * `is_visible = false` cache la photo sans la supprimer (modération).
 */
class BalPhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'path',
        'landscape_path',
        'square_path',
        'caption',
        'uploaded_by',
        'display_order',
        'is_visible',
    ];

    protected $casts = [
        'is_visible'    => 'boolean',
        'display_order' => 'integer',
    ];

    protected $appends = ['image_url'];

    /** Event auquel appartient cette photo. */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** Utilisateur (photographe) ayant uploadé la photo. */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** URL absolue de la photo. */
    public function getImageUrlAttribute(): ?string
    {
        if (empty($this->path)) {
            return null;
        }

        if (str_starts_with($this->path, 'http')) {
            return $this->path;
        }

        return asset('storage/'.ltrim($this->path, '/'));
    }
}
