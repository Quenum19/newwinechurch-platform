<?php

/**
 * Migration — Présences aux réunions de cellule.
 *
 * Le leader saisit pour chaque membre sa présence/absence à la réunion
 * hebdomadaire. Une ligne par (cellule, membre, date) — unique.
 *
 * Volumétrie cible : 5000 cellules × ~12 membres × 52 semaines = ~3M lignes/an.
 * Les index sont critiques pour éviter le scan complet.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cell_attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cell_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('users')->cascadeOnDelete();
            $table->date('meeting_date');
            $table->boolean('is_present')->default(false);
            $table->boolean('arrived_late')->default(false);
            $table->string('note')->nullable();
            $table->foreignId('recorded_by')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            // Unicité : un membre n'a qu'une entrée par cellule et par date.
            $table->unique(['cell_id', 'member_id', 'meeting_date'], 'cell_attendance_unique');
            $table->index(['cell_id', 'meeting_date']);
            $table->index(['member_id', 'meeting_date']);
            $table->index(['cell_id', 'is_present']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cell_attendance');
    }
};
