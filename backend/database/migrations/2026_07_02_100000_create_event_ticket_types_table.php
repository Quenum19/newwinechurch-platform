<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 billetterie — Types de tickets par événement.
 *
 * Permet de définir plusieurs catégories de places pour un même event :
 *  - Standard : 5 000 FCFA
 *  - VIP : 15 000 FCFA
 *  - Étudiant : 2 500 FCFA
 *  - Bénévole : 0 FCFA (gratuit dans un event payant — cas mixte)
 *
 * Si un event n'a aucun ticket_type, il fonctionne comme Phase 1 (1 seul type
 * implicite, gratuit). Sinon les inscriptions DOIVENT choisir un type.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_ticket_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            $table->string('name', 100);              // ex: "Standard", "VIP", "Étudiant"
            $table->string('slug', 50);                // ex: "standard" (unique par event)
            $table->text('description')->nullable();   // ce qui est inclus
            $table->unsignedInteger('price_fcfa')->default(0); // 0 = gratuit, mixte autorisé
            // Capacité par type — nullable = partage le pool global de l'event.
            $table->unsignedInteger('capacity')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            // Limite achat / inscription pour ce type spécifique (override le max event).
            $table->unsignedTinyInteger('max_per_order')->nullable();
            // Couleur/badge pour différencier visuellement (UI).
            $table->string('color_hex', 7)->nullable();

            $table->timestamps();

            $table->unique(['event_id', 'slug']);
            $table->index(['event_id', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_ticket_types');
    }
};
