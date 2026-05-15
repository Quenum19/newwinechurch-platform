<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Modèle NewsletterSubscriber — abonné newsletter avec double opt-in.
 */
class NewsletterSubscriber extends Model
{
    use HasFactory;

    protected $fillable = [
        'email', 'name', 'language',
        'is_confirmed', 'confirmation_token',
        'confirmed_at', 'unsubscribed_at',
    ];

    protected $casts = [
        'is_confirmed'    => 'boolean',
        'confirmed_at'    => 'datetime',
        'unsubscribed_at' => 'datetime',
    ];

    /** Génère un token de confirmation aléatoire 64 caractères. */
    public static function generateToken(): string
    {
        return Str::random(64);
    }

    /** Abonnés actifs (confirmés + non désinscrits). */
    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_confirmed', true)->whereNull('unsubscribed_at');
    }
}
