<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /**
     * Fenêtre de téléchargement public, en jours à partir de la MISE EN LIGNE
     * du média (created_at) — et non de la date de l'événement. Passé ce délai
     * la photo reste visible sur le site, mais n'est plus téléchargeable.
     */
    public const DOWNLOAD_WINDOW_DAYS = 15;

    /** Date de fermeture des téléchargements pour ce média. */
    public function downloadUntil(): ?\Illuminate\Support\Carbon
    {
        return $this->created_at?->copy()->addDays(self::DOWNLOAD_WINDOW_DAYS);
    }

    public function isDownloadable(): bool
    {
        $until = $this->downloadUntil();
        return $until === null || $until->isFuture();
    }

    /** Limite une requête aux médias encore téléchargeables. */
    public function scopeDownloadable(Builder $q): Builder
    {
        return $q->where('created_at', '>', now()->subDays(self::DOWNLOAD_WINDOW_DAYS));
    }

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

    /** Logs de téléchargement (pour analytics + badge admin). */
    public function downloads(): HasMany
    {
        return $this->hasMany(MediaDownload::class, 'media_id');
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
