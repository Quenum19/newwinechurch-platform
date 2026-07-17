<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 5 billetterie — Ajoute series_id sur events (nullable, backward-compat).
 *
 * Un event peut être :
 *  - Indépendant (series_id = NULL) — comportement Phase 1-4 inchangé
 *  - Occurrence d'une série (series_id = X) — fait partie d'un cycle
 *
 * On garde aussi sort_order pour pouvoir trier les occurrences d'une série
 * dans un ordre éditorial (différent de la date).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('series_id')->nullable()->after('id')
                  ->constrained('event_series')->nullOnDelete();
            $table->unsignedSmallInteger('series_sort_order')->nullable()->after('series_id');

            $table->index(['series_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['series_id']);
            $table->dropIndex(['series_id', 'starts_at']);
            $table->dropColumn(['series_id', 'series_sort_order']);
        });
    }
};
