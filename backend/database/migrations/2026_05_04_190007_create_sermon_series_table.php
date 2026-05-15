<?php

/**
 * Migration 07 — Séries de sermons.
 *
 * Une série regroupe plusieurs messages thématiques (ex: "Identité dans
 * Christ — 5 messages"). Doit être créée AVANT sermons (FK).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sermon_series', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('cover_image')->nullable();
            $table->date('started_at')->nullable();
            $table->date('ended_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
            $table->index('started_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sermon_series');
    }
};
