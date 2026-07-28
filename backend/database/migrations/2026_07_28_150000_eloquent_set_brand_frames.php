<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 3ᵉ tentative : bascule sur Eloquent pour bénéficier du cast 'array'
 * sur brand_frames dans le modèle Event.
 *
 * Les 2 migrations précédentes utilisaient DB::table()->update() avec
 * un json_encode manuel — ça peut créer un double-encodage sur MySQL
 * (chaîne quotée stockée à la place d'un objet JSON), qui après cast
 * array renvoie une string, jamais un array → is_array() reste false.
 *
 * Eloquent gère l'encodage/décodage via le cast. On log aussi le SELECT
 * après update pour confirmer la valeur réellement stockée.
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

        $event = Event::find(3);
        if (! $event) {
            $event = Event::where('slug', 'a-dark-night-in-elegance')->first();
        }

        if (! $event) {
            Log::warning('brand_frames migration: event Dark Night introuvable');
            return;
        }

        // Assigne via l'attribut du modèle → cast 'array' encode proprement.
        $event->brand_frames = $frames;
        $event->save();

        // Vérif du RAW en DB (bypass cast) pour voir ce qui est vraiment écrit.
        $raw = DB::table('events')->where('id', $event->id)->value('brand_frames');
        Log::info('brand_frames after save', [
            'event_id'   => $event->id,
            'raw_value'  => is_string($raw) ? substr($raw, 0, 200) : gettype($raw),
            'raw_length' => is_string($raw) ? strlen($raw) : 0,
        ]);
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
