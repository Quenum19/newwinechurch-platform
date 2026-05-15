<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle MediaGallery — élément (image ou vidéo) de la galerie publique.
 *
 * Refonte Étape 5 : ajout du lien optionnel à un département (rattachement
 * thématique pour la page publique d'un département) + flags is_featured /
 * sort_order pour l'éditorialisation.
 */
class MediaGallery extends Model
{
    use HasFactory;

    protected $table = 'media_gallery';

    protected $fillable = [
        'title', 'description', 'file_path', 'file_type',
        'file_size', 'thumbnail', 'event_id', 'department_id',
        'uploaded_by', 'is_published', 'is_featured', 'sort_order',
    ];

    protected $casts = [
        'file_size'    => 'integer',
        'is_published' => 'boolean',
        'is_featured'  => 'boolean',
        'sort_order'   => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    public function scopeForDepartment(Builder $q, int $departmentId): Builder
    {
        return $q->where('department_id', $departmentId);
    }

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where('is_featured', true);
    }
}
