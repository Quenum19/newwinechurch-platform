<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Str;

/**
 * Création de l'event "Festi Grill '26" avec la config EventHub complète.
 *
 * Idempotent : si l'event existe déjà (slug 'festi-grill-26'), on
 * met à jour sa config sans le dupliquer.
 *
 * Config appliquée :
 *   - modules_enabled :
 *       registration + address_capture + choice_workflow=mountain
 *       + ticketing_after_choice + media_gallery
 *       + cross_check_previous_event_id=3 (Bal DNE)
 *   - registration_form_config : formulaire complet (adresse + attended_bal)
 *   - brand_frames : réutilise les 4 PNG dark-night pour l'instant (le
 *     département média produira les vrais cadres Festi Grill à insérer
 *     via UPDATE quand ils seront prêts — la config le reprendra automatiquement).
 *
 * Fenêtre pré-inscription : 18-23 août 2026 (planning validé).
 */
return new class extends Migration {
    public function up(): void
    {
        $slug = 'festi-grill-26';
        $event = Event::withTrashed()->where('slug', $slug)->first();
        $existed = (bool) $event;

        // events.created_by est NOT NULL — on rattache au premier
        // superadmin / pasteur trouvé (ou fallback id=1).
        $ownerId = User::role(['superadmin', 'pasteur', 'admin'])->value('id')
                   ?? User::query()->value('id')
                   ?? 1;

        $payload = [
            'created_by'   => $ownerId,
            'title'        => "Festi Grill '26",
            'title_en'     => "Festi Grill '26",
            'slug'         => $slug,
            'description'  => "Après le bal, on continue l'aventure. Grillades, musique, ambiance village — venez découvrir les 7 sphères d'influence de New Wine Church dans une ambiance conviviale, avant la rentrée.",
            'type'         => 'festival',
            'location'     => 'Maison de la destinée · Anono',
            'starts_at'    => '2026-08-28 17:00:00',
            'ends_at'      => '2026-08-28 22:00:00',
            'is_online'    => false,
            'is_featured'  => true,
            'is_published' => true,

            'modules_enabled' => [
                'registration'                    => true,
                'address_capture'                 => true,
                'choice_workflow'                 => 'mountain',
                'ticketing_after_choice'          => true,
                'media_gallery'                   => true,
                'live_screen'                     => false,
                'cross_check_previous_event_id'   => 3, // Bal DNE
            ],

            'registration_form_config' => [
                'fields' => [
                    ['key' => 'first_name',   'required' => true],
                    ['key' => 'name',         'required' => true],
                    ['key' => 'email',        'required' => true],
                    ['key' => 'phone',        'required' => true],
                    ['key' => 'whatsapp',     'required' => false],
                    ['key' => 'commune',      'required' => true],
                    ['key' => 'quartier',     'required' => false],
                    ['key' => 'attended_bal', 'required' => false],
                ],
                'opens_at'  => '2026-08-18 00:00:00',
                'closes_at' => '2026-08-23 23:59:59',
                'success_message' => "Merci ! Ta place est réservée. On te recontacte pour la suite (choix de ta montagne + ticket).",
            ],

            // Frames PLACEHOLDERS : réutilise dark-night en attendant la
            // livraison des vrais PNG Festi Grill. Le département média
            // n'a qu'à uploader dans resources/frames/festi-grill-* puis
            // UPDATE events SET brand_frames = ... pour basculer.
            'brand_frames' => [
                'tv'        => 'frames/dark-night-tv.png',
                'landscape' => 'frames/dark-night-landscape.png',
                'square'    => 'frames/dark-night-square.png',
                'story'     => 'frames/dark-night-story.png',
            ],
        ];

        if ($event) {
            $event->fill($payload)->save();
        } else {
            Event::create($payload);
        }
    }

    public function down(): void
    {
        Event::where('slug', 'festi-grill-26')->delete();
    }
};
