<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Type de ticket d'un événement (Phase 2).
 *
 * Un event peut avoir 0 ou N types. Si 0 → fonctionne en mode "ticket unique
 * gratuit" comme Phase 1.
 */
class EventTicketType extends Model
{
    use HasFactory, \App\Models\Concerns\HasBilingualFields;

    protected array $bilingualFields = ['name', 'description'];

    protected $fillable = [
        'event_id',
        'name', 'name_en',
        'slug',
        'description', 'description_en',
        'price_fcfa', 'capacity',
        'sort_order', 'is_active', 'max_per_order', 'color_hex',
    ];

    protected $casts = [
        'price_fcfa'    => 'integer',
        'capacity'      => 'integer',
        'sort_order'    => 'integer',
        'max_per_order' => 'integer',
        'is_active'     => 'boolean',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(EventTicket::class, 'ticket_type_id');
    }

    /** Nombre de tickets actifs (non annulés/expirés/refusés) pour ce type. */
    public function getSoldAttribute(): int
    {
        return $this->tickets()
            ->whereIn('payment_status', ['free', 'pending', 'paid'])
            ->whereIn('status', ['confirmed', 'used'])
            ->count();
    }

    /** Places restantes pour ce type (ou null si pas de cap). */
    public function getRemainingAttribute(): ?int
    {
        if (! $this->capacity) return null;
        return max(0, $this->capacity - $this->sold);
    }

    /** Le type est-il vendable ? (actif + non plein) */
    public function getIsAvailableAttribute(): bool
    {
        if (! $this->is_active) return false;
        if ($this->capacity && $this->sold >= $this->capacity) return false;
        return true;
    }
}
