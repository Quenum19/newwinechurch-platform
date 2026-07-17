<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 5 billetterie — Table event_series.
 *
 * Une "série" regroupe N events (occurrences) liés par le même thème :
 *  - "Cycle Formation Discipulat" → 4 samedis consécutifs
 *  - "Conférence Vie Spirituelle" → 3 soirées de suite
 *  - "Veillée mensuelle" → 1er samedi de chaque mois
 *
 * Backward-compat : events.series_id reste nullable, les events existants
 * n'appartiennent à aucune série (Phase 1-4 inchangées).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_series', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->string('slug', 220)->unique();
            $table->text('description')->nullable();
            $table->string('cover_image', 255)->nullable();

            // Recurrence rule (simple). Phase 5 supporte hebdo + mensuel.
            // - none      : pas de récurrence (admin ajoute manuellement)
            // - weekly    : N occurrences sur jour fixe de la semaine
            // - monthly   : N occurrences le jour-mois fixé (ex: 15 de chaque mois)
            $table->enum('recurrence_type', ['none', 'weekly', 'monthly'])->default('none');

            // Pour weekly : 1-7 (lundi=1, dimanche=7) — ISO 8601
            // Pour monthly : 1-28 (cap pour éviter les mois courts)
            $table->unsignedTinyInteger('recurrence_day')->nullable();

            // Heure de chaque occurrence (ex: 18:00).
            $table->time('default_start_time')->nullable();

            // Durée par défaut en minutes (utilisé pour ends_at = starts_at + duration).
            $table->unsignedSmallInteger('default_duration_minutes')->default(120);

            // Lieu par défaut (chaque occurrence peut override).
            $table->string('default_location', 200)->nullable();
            $table->string('default_address', 200)->nullable();

            // Métadonnées
            $table->boolean('is_published')->default(true);
            $table->foreignId('created_by')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_published', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_series');
    }
};
