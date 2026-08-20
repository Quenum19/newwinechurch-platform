<?php

use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Database\Migrations\Migration;

/**
 * Nettoyage des tickets test (order_code LIKE 'TEST-%') sur Festi Grill '26.
 *
 * Contexte : plusieurs envois via le bouton "Envoyer ticket test" ont créé
 * des EventTicket éphémères dans la liste billetterie de l'event. Le user
 * demande de repartir sur base propre avant la campagne réelle.
 *
 * Idempotent : safe à re-run.
 */
return new class extends Migration {
    public function up(): void
    {
        $event = Event::where('slug', 'festi-grill-26')->first();
        if (! $event) return;

        EventTicket::where('event_id', $event->id)
            ->where('order_code', 'like', 'TEST-%')
            ->delete();
    }

    public function down(): void
    {
        // Non-idempotent : on ne remonte pas les tickets supprimés.
    }
};
