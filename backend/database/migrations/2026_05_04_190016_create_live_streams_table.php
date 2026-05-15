<?php

/**
 * Migration 16 — Live streams (Agora.io).
 *
 * L'admin planifie un live → quand il démarre, le frontend affiche
 * le badge "EN DIRECT" partout via WebSocket Reverb.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('live_streams', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();

            // Channel name unique côté Agora (utilisé pour rejoindre le stream).
            $table->string('channel_name')->unique();

            $table->enum('status', ['scheduled', 'live', 'ended'])
                  ->default('scheduled');

            $table->timestamp('scheduled_at');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->string('replay_url')->nullable();        // URL VOD après le live

            $table->string('cover_image')->nullable();
            $table->unsignedInteger('viewers_count')->default(0);
            $table->unsignedInteger('peak_viewers')->default(0); // record du live

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamps();

            // === INDEX ===
            $table->index('status');
            $table->index('scheduled_at');
            $table->index('created_by');
            // Index composé : "live actif" est la requête la plus fréquente.
            $table->index(['status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_streams');
    }
};
