<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsStorageUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    use FormatsStorageUrls;

    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            // Champs bilingues FR + version affichage selon Accept-Language.
            // Le frontend admin veut les 2 langues (pour éditer), le public veut display_*.
            'title'                 => $this->title,
            'title_en'              => $this->title_en,
            'display_title'         => $this->display_title,
            'slug'                  => $this->slug,
            'description'           => $this->description,
            'description_en'        => $this->description_en,
            'display_description'   => $this->display_description,
            'type'                  => $this->type,
            'location'              => $this->location,
            'location_en'           => $this->location_en,
            'display_location'      => $this->display_location,
            'address'               => $this->address,
            'starts_at'             => $this->starts_at?->toIso8601String(),
            'ends_at'               => $this->ends_at?->toIso8601String(),
            'cover_image'           => $this->fullStorageUrl($this->cover_image),
            'max_attendees'         => $this->max_attendees,
            'registration_required' => $this->registration_required,
            'registration_deadline' => $this->registration_deadline?->toIso8601String(),
            'registration_open'     => $this->isRegistrationOpen(),
            'is_online'             => $this->is_online,
            'online_link'           => $this->is_online ? $this->online_link : null,
            'is_featured'           => (bool) $this->is_featured,
            // CRITIQUE : sans ce champ, la liste admin affiche toujours
            // "Brouillon" alors que la case "Publié" est cochée dans le détail.
            // Même bug que SermonResource — exposer explicitement.
            'is_published'          => (bool) $this->is_published,
            'attendees_count'       => $this->whenCounted('registrations'),
            // Pour décider d'afficher le bouton "Galerie" côté public/admin.
            'media_count'           => $this->whenCounted('media'),
            // Compteur photos post-événement (générique) — utilisé pour
            // afficher le bouton "Voir la galerie" sur EventDetail public.
            'gallery_count'         => $this->whenCounted('galleryPhotos'),
            // === Billetterie (Phase 1) ===
            'ticketing_enabled'     => (bool) $this->ticketing_enabled,
            'tickets_capacity'      => $this->tickets_capacity,
            'tickets_per_email_max' => $this->tickets_per_email_max,
            'tickets_closes_at'     => $this->tickets_closes_at?->toIso8601String(),
            'require_selfie'        => (bool) $this->require_selfie,
            'allow_waitlist'        => (bool) $this->allow_waitlist,
            'support_phone'         => $this->support_phone,
            // Compteurs (calculés via accessors Event::getTicketsSoldAttribute, etc.)
            // mergeWhen évite les requêtes N+1 si non sollicité — mais nos accessors
            // sont déjà optimisés (1 count par event).
            'tickets_sold'          => $this->when($this->ticketing_enabled, fn () => $this->tickets_sold),
            'tickets_remaining'     => $this->when($this->ticketing_enabled, fn () => $this->tickets_remaining),
            // === Mode paiement (Phase 7) ===
            'payment_mode'          => $this->payment_mode ?? 'declarative',
            // === EventHub — modules activés + config formulaire d'inscription ===
            // modules_enabled : quels onglets/actions apparaissent dans le hub admin
            //   registration, address_capture, choice_workflow, ticketing_after_choice,
            //   live_screen, media_gallery, cross_check_previous_event_id
            // registration_form_config : quels champs le formulaire d'inscription
            // public rend + fenêtre opens_at/closes_at + success_message.
            'modules_enabled'       => $this->modules_enabled ?? [],
            'registration_form_config' => $this->registration_form_config ?? [],
        ];
    }
}
