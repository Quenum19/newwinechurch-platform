<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Opérateur de don (Mobile Money, virement, cash…).
 *
 * Affichage seulement — pas de lien direct avec `donations.method` (ENUM figée).
 * L'admin CRUD via /admin/donation-methods, public liste via /api/donation-methods.
 */
class DonationMethod extends Model
{
    protected $fillable = [
        'name', 'code', 'account_number', 'recipient_name',
        'logo_path', 'color_hex', 'instructions', 'ussd_code',
        'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) return null;
        // Si déjà absolu (http) on retourne tel quel, sinon on passe par le disk public.
        if (preg_match('#^https?://#', $this->logo_path)) return $this->logo_path;
        return Storage::disk('public')->url($this->logo_path);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy('sort_order')->orderBy('name');
    }
}
