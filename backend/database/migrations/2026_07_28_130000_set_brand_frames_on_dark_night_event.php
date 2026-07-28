<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Data migration : setter brand_frames sur l'event "A Dark Night in Elegance"
 * pour que le pipeline gallery/brand continue à fonctionner sur ses photos.
 *
 * Après la migration précédente qui a ajouté la colonne, un event sans
 * brand_frames défini ne reçoit AUCUN cadre (comportement voulu — évite
 * le bug qui appliquait le cadre DNE sur les autres events). Pour DNE
 * lui-même, il faut donc lui définir explicitement ses frames.
 *
 * Les chemins pointent vers les PNG livrés dans backend/resources/frames/
 * (relatifs à resources/, cf. BalPhotoComposer::resolveFrameFile).
 */
return new class extends Migration {
    public function up(): void
    {
        $frames = [
            'tv'        => 'frames/dark-night-tv.png',
            'landscape' => 'frames/dark-night-landscape.png',
            'square'    => 'frames/dark-night-square.png',
            'story'     => 'frames/dark-night-story.png',
        ];

        DB::table('events')
            ->where('slug', 'a-dark-night-in-elegance')
            ->update(['brand_frames' => json_encode($frames)]);
    }

    public function down(): void
    {
        DB::table('events')
            ->where('slug', 'a-dark-night-in-elegance')
            ->update(['brand_frames' => null]);
    }
};
