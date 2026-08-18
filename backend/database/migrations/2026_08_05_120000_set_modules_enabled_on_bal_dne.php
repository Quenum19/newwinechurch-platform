<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;

/**
 * Config initiale des modules pour l'event Bal DNE — permet aux onglets
 * du nouvel EventHub (Régie / Candidats / Photos / PDF) de s'afficher.
 *
 * Sans ça, ouvrir le hub d'un event = juste "Vue d'ensemble" + "Config".
 * Cette migration donne la vraie image "Bal live" attendue.
 *
 * Aucun autre event n'est touché — futures migrations similaires pour
 * chaque event qui a besoin de modules. À terme : édition depuis l'admin
 * (UI de config) plutôt que via migration.
 */
return new class extends Migration {
    public function up(): void
    {
        $event = Event::find(3); // A Dark Night in Elegance
        if (! $event) return;

        $event->modules_enabled = [
            'live_screen'   => true,   // onglets Régie + Candidats + Supports PDF
            'media_gallery' => true,   // onglet Galerie · Photos
            'registration'  => false,  // pas de form d'inscription générique
            'address_capture' => false,
            'choice_workflow' => null,
        ];
        $event->save();
    }

    public function down(): void
    {
        $event = Event::find(3);
        if ($event) {
            $event->modules_enabled = null;
            $event->save();
        }
    }
};
