<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class PostCategory extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = ['name', 'name_en', 'slug', 'description', 'color'];

    protected $appends = ['display_name'];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /** Renvoie name_en si locale=en et traduction présente, sinon name. */
    public function getDisplayNameAttribute(): string
    {
        if (app()->getLocale() === 'en' && ! empty($this->name_en)) {
            return $this->name_en;
        }
        return $this->name ?? '';
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'category_id');
    }
}
