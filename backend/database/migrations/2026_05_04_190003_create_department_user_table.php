<?php

/**
 * Migration 03 — Pivot department_user.
 *
 * Un membre peut appartenir à plusieurs départements.
 * Le rôle distingue le gouverneur des membres simples.
 *
 * Refonte Étape 1 : 'captain' renommé en 'governor' pour aligner sur la
 * nouvelle nomenclature. L'historique des nominations est traité par
 * la table department_governors (avec appointed_at/ended_at).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('department_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['governor', 'assistant', 'member'])->default('member');
            $table->date('joined_at')->nullable();
            $table->timestamps();

            // Unicité : un user ne peut pas être deux fois dans le même département.
            $table->unique(['department_id', 'user_id']);
            $table->index('user_id');
            $table->index('department_id');
            $table->index('role');
            $table->index(['department_id', 'role']); // filtrage gouverneur d'un département
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_user');
    }
};
