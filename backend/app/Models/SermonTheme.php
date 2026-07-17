<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

/**
 * Thème de sermon — tag transverse pour l'archivage long terme.
 *
 * Règle métier :
 *   - is_default = true → thème seedé, l'admin peut le RENOMMER mais pas le
 *     supprimer (protection de l'archivage à 20 ans).
 *   - is_default = false → thème créé par l'admin, modifiable + supprimable.
 */
class SermonTheme extends Model
{
    use HasFactory, HasSlug;

    protected $table = 'sermon_themes';

    protected $fillable = [
        'slug', 'name', 'description', 'color',
        'is_default', 'sort_order',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug')
            // Les slugs de thèmes seedés sont stables (le seeder s'occupe d'eux).
            // Un rename par admin met à jour le slug d'un thème custom.
            ->doNotGenerateSlugsOnUpdate();
    }

    public function sermons(): BelongsToMany
    {
        return $this->belongsToMany(
            Sermon::class,
            'sermon_theme_sermon',
            'theme_id',
            'sermon_id',
        )->withTimestamps();
    }

    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy('sort_order')->orderBy('name');
    }
}
