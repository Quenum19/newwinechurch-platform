<?php

/**
 * Migration 05 — Pivot cell_user.
 *
 * Un membre fait partie d'une (et idéalement une seule) cellule.
 * Le flag `is_convert` marque une âme gagnée par évangélisation.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cell_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cell_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['leader', 'member'])->default('member');
            $table->date('joined_at')->nullable();
            $table->boolean('is_convert')->default(false); // âme gagnée
            $table->timestamps();

            $table->unique(['cell_id', 'user_id']);
            $table->index('cell_id');
            $table->index('user_id');
            $table->index('is_convert');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cell_user');
    }
};
