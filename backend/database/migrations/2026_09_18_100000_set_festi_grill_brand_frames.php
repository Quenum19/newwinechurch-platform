<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

/**
 * Bascule Festi Grill '26 sur ses propres cadres photo.
 *
 * À sa création, l'event réutilisait les cadres "dark-night-*" du Bal en
 * attendant les siens. Les 4 PNG Festi Grill sont désormais livrés dans
 * resources/frames/ (sources : docs/festi-grill-26/cadres-photos/).
 *
 * Ciblage strict par slug : le Bal et les autres events ne sont pas touchés.
 * Passage par Eloquent pour bénéficier du cast 'array' (un DB::table()->update
 * avec json_encode manuel double-encodait la valeur — cf. migrations Bal).
 *
 * Les photos déjà pré-composées avec l'ancien cadre se régénèrent via :
 *   php artisan gallery:recompose --event=festi-grill-26
 */
return new class extends Migration {
    private const SLUG = 'festi-grill-26';

    public function up(): void
    {
        $event = Event::withTrashed()->where('slug', self::SLUG)->first();
        if (! $event) {
            Log::info('set_festi_grill_brand_frames: event absent, rien à faire');
            return;
        }

        $event->brand_frames = [
            'tv'        => 'frames/festi-grill-tv.png',
            'landscape' => 'frames/festi-grill-landscape.png',
            'square'    => 'frames/festi-grill-square.png',
            'story'     => 'frames/festi-grill-story.png',
        ];
        $event->save();
    }

    public function down(): void
    {
        $event = Event::withTrashed()->where('slug', self::SLUG)->first();
        if (! $event) return;

        $event->brand_frames = [
            'tv'        => 'frames/dark-night-tv.png',
            'landscape' => 'frames/dark-night-landscape.png',
            'square'    => 'frames/dark-night-square.png',
            'story'     => 'frames/dark-night-story.png',
        ];
        $event->save();
    }
};
