<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;

/**
 * Restauration des 4 frames sur l'event DNE — mon endpoint debug a écrasé
 * la valeur avec juste {tv: ...} pendant le diagnostic. Idempotente : safe
 * à re-run.
 */
return new class extends Migration {
    public function up(): void
    {
        $event = Event::find(3);
        if (! $event) return;

        $event->brand_frames = [
            'tv'        => 'frames/dark-night-tv.png',
            'landscape' => 'frames/dark-night-landscape.png',
            'square'    => 'frames/dark-night-square.png',
            'story'     => 'frames/dark-night-story.png',
        ];
        $event->save();
    }

    public function down(): void
    {
        $event = Event::find(3);
        if ($event) {
            $event->brand_frames = null;
            $event->save();
        }
    }
};
