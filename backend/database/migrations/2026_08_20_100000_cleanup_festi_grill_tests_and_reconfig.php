<?php

use App\Models\Event;
use App\Models\MembershipRequest;
use Illuminate\Database\Migrations\Migration;

/**
 * Nettoyage tests Festi Grill + reconfiguration du formulaire.
 *
 * 1. Supprime les préinscriptions test (source=event-registration) sur l'event
 *    Festi Grill '26 (id 14) — le user demande de repartir sur base propre.
 * 2. Met à jour registration_form_config :
 *    - quartier passe en required (utile pour dispatch transport)
 *    - attended_bal passe en required (le user veut forcer une réponse
 *      explicite ; l'input reste une checkbox déclarative)
 *    - success_message simplifié : retire la mention parasite
 *      "(choix de ta montagne + ticket)".
 */
return new class extends Migration {
    public function up(): void
    {
        $event = Event::where('slug', 'festi-grill-26')->first();
        if (! $event) return;

        // 1. Nettoyage des tests
        MembershipRequest::where('event_id', $event->id)
            ->where('source', 'event-registration')
            ->delete();

        // 2. Reconfiguration du formulaire
        $event->registration_form_config = [
            'fields' => [
                ['key' => 'first_name',   'required' => true],
                ['key' => 'name',         'required' => true],
                ['key' => 'email',        'required' => true],
                ['key' => 'phone',        'required' => true],
                ['key' => 'whatsapp',     'required' => false],
                ['key' => 'commune',      'required' => true],
                ['key' => 'quartier',     'required' => true],   // était false
                ['key' => 'attended_bal', 'required' => true],   // était false
            ],
            'opens_at'  => '2026-08-18 00:00:00',
            'closes_at' => '2026-08-23 23:59:59',
            'success_message' => "Merci ! Ta place est réservée. On te recontacte pour la suite.",
        ];
        $event->save();
    }

    public function down(): void
    {
        // Non-idempotent : on ne remonte pas les données supprimées.
        // Restauration du success_message précédent uniquement.
        $event = Event::where('slug', 'festi-grill-26')->first();
        if (! $event) return;
        $cfg = $event->registration_form_config ?? [];
        $cfg['success_message'] = "Merci ! Ta place est réservée. On te recontacte pour la suite (choix de ta montagne + ticket).";
        $event->registration_form_config = $cfg;
        $event->save();
    }
};
