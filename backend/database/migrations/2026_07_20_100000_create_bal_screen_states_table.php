<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table `bal_screen_states` — état courant de l'écran live du Bal 2026.
 *
 * Une seule ligne par événement (unique event_id). Contient :
 *  - la slide actuellement affichée à l'écran fullscreen
 *  - la config JSON associée (ex: nom du rappeur à afficher, message custom…)
 *  - le statut du vote Roi & Reine (closed | open | proclamation)
 *
 * L'écran public poll cet état ~1s pour se mettre à jour temps réel sans WebSocket.
 * La régie (panneau admin) modifie cette ligne via /admin/events/{id}/bal/*.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('bal_screen_states', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            // Slide courante (identifiant libre côté frontend écran) :
            //   default, arrivee, ambiance, vote, proclamation, rappeur, etc.
            $table->string('current_slide', 60)->default('default');

            // Paramètres de la slide (ex: {"rappeur_name": "MC XYZ"}).
            $table->json('config')->nullable();

            // Cycle de vie du vote Roi & Reine.
            $table->enum('vote_status', ['closed', 'open', 'proclamation'])
                  ->default('closed');
            $table->timestamp('vote_opened_at')->nullable();
            $table->timestamp('vote_closed_at')->nullable();

            $table->timestamp('updated_at')->nullable();

            // 1 seule ligne d'état par event.
            $table->unique('event_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bal_screen_states');
    }
};
