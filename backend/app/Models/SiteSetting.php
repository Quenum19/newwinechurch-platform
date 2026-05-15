<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Modèle SiteSetting — paramètres dynamiques clé/valeur.
 *
 * Utilisation :
 *   SiteSetting::get('contact.email')                  // valeur seule
 *   SiteSetting::group('donation')                     // tableau associatif
 *   SiteSetting::set('logo.nwc', '/logos/new.png')     // mise à jour
 */
class SiteSetting extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'value', 'type', 'group', 'updated_by'];

    /** Cache invalidé à chaque save() / delete(). */
    protected static function booted(): void
    {
        $forget = function () {
            Cache::forget('site_settings:all');
            Cache::forget('site_settings:public');
        };
        static::saved($forget);
        static::deleted($forget);
    }

    /**
     * Récupère toutes les settings sous forme tableau ['key' => 'value', ...].
     * NB : on ne peut pas utiliser `all()` (réservé par Eloquent\Model::all).
     */
    public static function allFlat(): array
    {
        return Cache::remember('site_settings:all', 3600, function () {
            return static::query()->pluck('value', 'key')->all();
        });
    }

    /** Lit une seule clé. */
    public static function get(string $key, mixed $default = null): mixed
    {
        return static::allFlat()[$key] ?? $default;
    }

    /** Renvoie toutes les settings d'un groupe (ex: 'donation', 'social'). */
    public static function group(string $group): array
    {
        return static::query()->where('group', $group)
                              ->pluck('value', 'key')
                              ->all();
    }

    /** Met à jour ou crée une setting. */
    public static function set(string $key, mixed $value, ?string $type = null, ?string $group = null): void
    {
        static::updateOrCreate(
            ['key' => $key],
            array_filter([
                'value' => $value,
                'type'  => $type,
                'group' => $group,
            ], fn ($v) => $v !== null)
        );
    }

    /**
     * Renvoie les settings publiquement exposables au frontend
     * (les comptes Mobile Money, logos, social, identité d'église).
     * On exclut les settings sensibles (admin only).
     */
    public static function publicSettings(): array
    {
        return Cache::remember('site_settings:public', 3600, function () {
            $allowed = ['identity', 'contact', 'branding', 'social', 'donation', 'live'];
            return static::whereIn('group', $allowed)
                         ->pluck('value', 'key')
                         ->all();
        });
    }
}
