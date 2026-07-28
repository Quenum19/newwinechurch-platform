<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Log léger des téléchargements de médias — analytics.
 *
 * ip_hash : sha1(ip) pour dédup sans stocker d'IP en clair (RGPD friendly).
 * user_agent : tronqué à 500 chars pour éviter les explosions.
 */
class MediaDownload extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'media_id', 'event_id', 'format', 'ip_hash', 'user_agent', 'downloaded_at',
    ];

    protected $casts = [
        'downloaded_at' => 'datetime',
    ];

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaGallery::class, 'media_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
