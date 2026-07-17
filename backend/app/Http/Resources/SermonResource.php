<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsStorageUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * SermonResource — formatte un sermon pour l'API.
 *
 * Utilisé en liste (champs essentiels) et en détail (champs étendus).
 */
class SermonResource extends JsonResource
{
    use FormatsStorageUrls;

    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'title'               => $this->title,
            'title_en'            => $this->title_en,
            'display_title'       => $this->display_title,
            'slug'                => $this->slug,
            'description'         => $this->description,
            'description_en'      => $this->description_en,
            'display_description' => $this->display_description,
            'scripture_reference' => $this->scripture_reference,
            'sermon_date'         => $this->sermon_date?->toDateString(),
            'type'                => $this->type,
            'video_url'           => $this->fullStorageUrl($this->video_url),
            'audio_url'           => $this->fullStorageUrl($this->audio_url),
            'youtube_url'         => $this->youtube_url,
            // URL ABSOLUE pour que le frontend (newinechurch.org) résolve
            // vers api.newinechurch.org/storage/... et non pas vers sa propre origine.
            'thumbnail'           => $this->fullStorageUrl($this->thumbnail),
            'duration_seconds'    => $this->duration_seconds,
            'duration_human'      => $this->duration_seconds
                ? sprintf('%d min', round($this->duration_seconds / 60))
                : null,
            'views_count'         => $this->views_count,
            'is_featured'         => (bool) $this->is_featured,
            // CRITIQUE : sans ce champ, l'admin ne sait pas si le sermon est
            // publié → icône œil + badge "Brouillon" gelés sur la liste.
            'is_published'        => (bool) $this->is_published,
            'published_at'        => $this->published_at?->toIso8601String(),

            // Le frontend lit `speaker.name` partout. On unifie la sortie pour
            // qu'un prédicateur externe (sans compte user) soit toujours
            // exposé avec la même forme — sinon les cartes/listes affichent
            // "—" alors que l'admin a bien renseigné un nom.
            'speaker' => $this->resolveSpeaker(),
            // Le champ brut, utile au formulaire admin pour pré-remplir
            // l'autocomplete en mode "saisie libre".
            'external_speaker_name' => $this->external_speaker_name,

            'series' => $this->whenLoaded('series', fn () => $this->series ? [
                'id'    => $this->series->id,
                'title' => $this->series->title,
                'slug'  => $this->series->slug,
            ] : null),

            // Thèmes / tags transverses — cœur du système d'archivage long terme.
            'themes' => $this->whenLoaded('themes', fn () => $this->themes->map(fn ($t) => [
                'id'    => $t->id,
                'slug'  => $t->slug,
                'name'  => $t->name,
                'color' => $t->color,
            ])->values()),
        ];
    }

    /**
     * Retourne le prédicateur sous une forme stable, qu'il soit interne (User
     * via speaker_id) ou externe (champ texte external_speaker_name).
     * Renvoie null si aucun des deux n'est défini.
     */
    private function resolveSpeaker(): ?array
    {
        if ($this->relationLoaded('speaker') && $this->speaker) {
            return [
                'id'       => $this->speaker->id,
                'name'     => $this->speaker->full_name,
                'avatar'   => $this->speaker->avatar,
                'is_guest' => false,
            ];
        }

        if (! empty($this->external_speaker_name)) {
            return [
                'id'       => null,
                'name'     => $this->external_speaker_name,
                'avatar'   => null,
                'is_guest' => true,
            ];
        }

        return null;
    }
}
