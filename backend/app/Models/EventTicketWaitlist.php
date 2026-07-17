<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventTicketWaitlist extends Model
{
    use HasFactory;

    protected $table = 'event_ticket_waitlist';

    protected $fillable = [
        'event_id', 'first_name', 'last_name', 'email', 'phone',
        'quantity', 'position', 'status', 'promoted_at',
    ];

    protected $casts = [
        'promoted_at' => 'datetime',
        'quantity'    => 'integer',
        'position'    => 'integer',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function scopeWaiting(Builder $q): Builder
    {
        return $q->where('status', 'waiting');
    }
}
