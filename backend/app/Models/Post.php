<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Post extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'title', 'slug', 'excerpt', 'content', 'cover_image',
        'author_id', 'category_id', 'status',
        'is_featured', 'published_at', 'views_count',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'is_featured'  => 'boolean',
        'views_count'  => 'integer',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PostCategory::class, 'category_id');
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('status', 'published')
                 ->where(function ($q) {
                     $q->whereNull('published_at')
                       ->orWhere('published_at', '<=', now());
                 });
    }

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where('is_featured', true);
    }

    public function recordView(): void
    {
        $this->increment('views_count');
    }
}
