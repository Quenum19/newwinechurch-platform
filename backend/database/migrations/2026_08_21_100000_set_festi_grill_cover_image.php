<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

/**
 * Copie l'affiche Festi Grill (déjà déployée en resources pour le PDF ticket)
 * vers storage/app/public/events/ et met à jour events.cover_image pour que
 * la page publique + inscription puissent l'afficher en hero.
 *
 * Source : backend/resources/tickets/festi-grill-26/hero.jpg
 * Dest   : storage/app/public/events/festi-grill-26-cover.jpg
 * Servi via /storage/events/festi-grill-26-cover.jpg (symlink public/storage).
 *
 * Idempotent — safe à re-run.
 */
return new class extends Migration {
    public function up(): void
    {
        $event = Event::where('slug', 'festi-grill-26')->first();
        if (! $event) return;

        $source = base_path('resources/tickets/festi-grill-26/hero.jpg');
        if (! @file_exists($source)) return;

        $destRel = 'events/festi-grill-26-cover.jpg';
        Storage::disk('public')->put($destRel, file_get_contents($source), 'public');

        $event->cover_image = $destRel;
        $event->save();
    }

    public function down(): void
    {
        // Non-idempotent : on ne remonte pas le cover_image précédent.
        $event = Event::where('slug', 'festi-grill-26')->first();
        if ($event && $event->cover_image === 'events/festi-grill-26-cover.jpg') {
            Storage::disk('public')->delete('events/festi-grill-26-cover.jpg');
            $event->cover_image = null;
            $event->save();
        }
    }
};
