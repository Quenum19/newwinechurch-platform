<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * État courant de l'écran live du Bal 2026.
 *
 * Une seule ligne par événement (contrainte unique event_id).
 * Cette ligne est manipulée par la régie et lue par l'écran fullscreen.
 */
class BalScreenState extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'current_slide',
        'config',
        'vote_status',
        'vote_opened_at',
        'vote_closed_at',
    ];

    protected $casts = [
        'config'         => 'array',
        'vote_opened_at' => 'datetime',
        'vote_closed_at' => 'datetime',
        'updated_at'     => 'datetime',
    ];

    /** La table n'a pas de created_at (une seule ligne par event via updateOrCreate). */
    public const CREATED_AT = null;

    /** Event auquel appartient cet état. */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
