<?php

namespace App\Models\Concerns;

/**
 * Trait pour modèles bilingues FR/EN.
 *
 * Chaque modèle qui l'utilise déclare `$bilingualFields = ['title', 'description', ...]`.
 * Le trait expose automatiquement des accessors `display_{champ}` qui retournent
 * la version EN si `app()->getLocale() === 'en'` ET que la colonne `{champ}_en`
 * est non-vide, sinon fallback sur la version FR.
 *
 * Usage :
 *   class Event extends Model {
 *       use HasBilingualFields;
 *       protected array $bilingualFields = ['title', 'description', 'location'];
 *   }
 *
 *   // Dans le code : $event->display_title, $event->display_description
 *   // Ou pour un champ spécifique : $event->localizedField('title')
 */
trait HasBilingualFields
{
    /**
     * Retourne la version localisée d'un champ.
     * Fallback : si locale=en et {field}_en est vide → utilise {field}.
     */
    public function localizedField(string $field): ?string
    {
        $enField = $field . '_en';
        if (app()->getLocale() === 'en'
            && ! empty($this->attributes[$enField] ?? null)) {
            return $this->attributes[$enField];
        }
        return $this->attributes[$field] ?? null;
    }

    /**
     * Magic accessor : $model->display_title équivaut à
     * $model->localizedField('title'). Marche pour tous les champs déclarés
     * dans $bilingualFields.
     */
    public function __get($key)
    {
        if (str_starts_with($key, 'display_')) {
            $field = substr($key, 8); // "display_title" → "title"
            $bilingual = property_exists($this, 'bilingualFields')
                ? $this->bilingualFields
                : [];
            if (in_array($field, $bilingual, true)) {
                return $this->localizedField($field);
            }
        }
        return parent::__get($key);
    }
}
