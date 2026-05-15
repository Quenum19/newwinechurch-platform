<?php

/**
 * Migration — Pivot events ↔ departments (Étape 5/5).
 *
 * Un événement peut concerner un ou plusieurs départements (ex: une
 * réunion conjointe Évangélisation + Médias). La page publique du
 * département affiche les 3 prochains événements rattachés.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_department', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['event_id', 'department_id']);
            $table->index('department_id');
            $table->index('event_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_department');
    }
};
