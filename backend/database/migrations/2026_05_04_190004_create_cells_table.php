<?php

/**
 * Migration 04 — Cellules d'évangélisation.
 *
 * Une cellule est un petit groupe de quartier qui se réunit chaque semaine
 * pour évangéliser et discipliner. Chaque cellule a un leader principal
 * (FK users, cache) et son historique est dans cell_leaders.
 *
 * Refonte Étape 1 : meeting_day passe en ENUM, ajout target_size,
 * whatsapp_link, is_active. status legacy conservé pour compat admin.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cells', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // Ex: "Cellule Cocody Centre"
            $table->string('slug')->unique();
            $table->text('description')->nullable();

            // Leader principal (cache — historique complet dans cell_leaders).
            $table->foreignId('leader_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->string('zone', 100)->nullable();         // quartier géographique
            $table->enum('meeting_day', [
                'lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche',
            ])->nullable();
            $table->time('meeting_time')->nullable();        // ex: 19:00
            $table->string('meeting_location')->nullable();
            $table->unsignedSmallInteger('target_size')->default(12); // taille cible avant scission
            $table->string('whatsapp_link')->nullable();     // lien d'invitation WhatsApp
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->boolean('is_active')->default(true);     // toggle rapide (UI)
            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index('name');
            $table->index('zone');
            $table->index('status');
            $table->index('is_active');
            $table->index('leader_id');
            $table->index('meeting_day');
            $table->index(['is_active', 'zone']); // listing par quartier
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cells');
    }
};
