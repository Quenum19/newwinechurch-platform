<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * === Fondation architecture "Event Hub" ===
 *
 * Ajoute 2 colonnes JSON à `events` pour rendre chaque event autonomement
 * configurable — sans jamais ajouter de menu au sidebar admin.
 *
 * modules_enabled — quels modules l'event active :
 *   {
 *     "registration": true,              // formulaire d'inscription public activé
 *     "address_capture": true,           // capture commune/quartier (dispatch transport)
 *     "cross_check_previous_event_id": 3,// afficher "était au bal DNE" (déclaratif)
 *     "choice_workflow": "mountain",     // "mountain" | "table" | "atelier" | null
 *     "ticketing_after_choice": true,    // ticket généré APRÈS complétion du choix
 *     "live_screen": false,              // écran live/régie (comme "Bal live · Régie")
 *     "media_gallery": true              // photos post-event avec cadre software
 *   }
 *
 * registration_form_config — champs du formulaire d'inscription :
 *   {
 *     "fields": [
 *       {"key": "first_name", "required": true},
 *       {"key": "name",       "required": true},
 *       {"key": "email",      "required": true},
 *       {"key": "phone",      "required": true},
 *       {"key": "whatsapp",   "required": false},
 *       {"key": "commune",    "required": true},
 *       {"key": "quartier",   "required": false},
 *       {"key": "attended_previous", "required": false, "label": "J'étais au Bal DNE"}
 *     ],
 *     "success_message": "Merci ! On te recontacte pour la suite.",
 *     "opens_at": "2026-08-18 00:00:00",
 *     "closes_at": "2026-08-23 23:59:59"
 *   }
 *
 * Le tout en JSON pour éviter les migrations à chaque nouvel event : la config
 * se change dans /admin/events/{id} > onglet Configuration.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->json('modules_enabled')->nullable()->after('brand_frames');
            $table->json('registration_form_config')->nullable()->after('modules_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['modules_enabled', 'registration_form_config']);
        });
    }
};
