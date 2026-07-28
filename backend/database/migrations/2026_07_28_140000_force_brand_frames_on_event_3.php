<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Reprise : la migration précédente (2026_07_28_130000) devait setter
 * brand_frames sur l'event "a-dark-night-in-elegance" mais l'API a
 * confirmé has_brand_frames=false en prod après son passage.
 *
 * Hypothèses possibles pour l'échec silencieux :
 *   - Slug avec un espace/caractère invisible
 *   - json_encode envoyé en param bindé mal interprété par MySQL selon
 *     la connexion (PDO_MYSQL vs mysqli)
 *   - Colonne créée après le run (race d'ordre migrations)
 *
 * Fix : update ciblé sur ID 3 (récupéré via /api/media?event=… en prod),
 * plus tolérant, avec log Laravel du résultat pour debug si ça re-rate.
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

        // Deux passes : par ID (fiable) puis par slug (fallback).
        $count = DB::table('events')
            ->where('id', 3)
            ->update(['brand_frames' => json_encode($frames)]);

        if ($count === 0) {
            $count = DB::table('events')
                ->where('slug', 'a-dark-night-in-elegance')
                ->update(['brand_frames' => json_encode($frames)]);
        }

        Log::info('brand_frames migration', [
            'rows_updated' => $count,
            'frames'       => $frames,
        ]);
    }

    public function down(): void
    {
        DB::table('events')->where('id', 3)->update(['brand_frames' => null]);
    }
};
