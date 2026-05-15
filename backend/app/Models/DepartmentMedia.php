<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Média (photo/vidéo) attaché à un département.
 *
 * Alimente la galerie publique de la page département. Peut être lié
 * à un événement précis pour grouper les médias par activité.
 */
class DepartmentMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'department_media';

    protected $fillable = [
        'department_id', 'event_id', 'media_type',
        'file_path', 'thumbnail_path', 'caption',
        'uploaded_by', 'is_featured', 'sort_order', 'views_count',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'sort_order'  => 'integer',
        'views_count' => 'integer',
    ];

    // === RELATIONS ===

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // === ACCESSEURS ===

    public function getFileUrlAttribute(): ?string
    {
        return $this->absoluteUrl($this->file_path);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->absoluteUrl($this->thumbnail_path) ?? $this->getFileUrlAttribute();
    }

    protected function absoluteUrl(?string $path): ?string
    {
        if (! $path) return null;
        if (str_starts_with($path, 'http')) return $path;
        return asset('storage/'.ltrim($path, '/'));
    }

    // === SCOPES ===

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where('is_featured', true);
    }

    public function scopeForDepartment(Builder $q, int $departmentId): Builder
    {
        return $q->where('department_id', $departmentId);
    }

    public function scopePhotos(Builder $q): Builder
    {
        return $q->where('media_type', 'photo');
    }

    public function scopeVideos(Builder $q): Builder
    {
        return $q->where('media_type', 'video');
    }
}
