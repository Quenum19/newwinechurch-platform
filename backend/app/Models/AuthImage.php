<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Image affichée sur le hero des pages auth.
 *
 * Le superadmin gère la liste via /admin/images-auth.
 * Le frontend pioche aléatoirement parmi les images actives.
 */
class AuthImage extends Model
{
    protected $fillable = [
        'title', 'path', 'verse_ref', 'verse_text',
        'sort_order', 'is_active', 'created_by',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        if (preg_match('#^https?://#', $this->path)) return $this->path;
        return Storage::disk('public')->url($this->path);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }
}
