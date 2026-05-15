<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle LiveStream — diffusion en direct sur Agora.io.
 */
class LiveStream extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'description', 'channel_name', 'status',
        'scheduled_at', 'started_at', 'ended_at',
        'replay_url', 'cover_image',
        'viewers_count', 'peak_viewers', 'created_by',
    ];

    protected $casts = [
        'scheduled_at'  => 'datetime',
        'started_at'    => 'datetime',
        'ended_at'      => 'datetime',
        'viewers_count' => 'integer',
        'peak_viewers'  => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Le live actuellement en cours (au plus un à la fois). */
    public function scopeCurrent(Builder $q): Builder
    {
        return $q->where('status', 'live');
    }

    public function scopeScheduled(Builder $q): Builder
    {
        return $q->where('status', 'scheduled')->orderBy('scheduled_at');
    }
}
