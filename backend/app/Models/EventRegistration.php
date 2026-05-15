<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle EventRegistration — inscription d'un membre à un événement.
 */
class EventRegistration extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'user_id', 'status', 'notes', 'registered_at',
    ];

    protected $casts = [
        'registered_at' => 'datetime',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
