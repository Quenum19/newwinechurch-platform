<?php

/**
 * Migration 08 — Sermons (messages audio/vidéo).
 *
 * Chaque sermon peut être un audio, une vidéo, ou un replay de live.
 * Les sermons sont la pierre angulaire du contenu pastoral.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sermons', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('speaker_id')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->foreignId('series_id')->nullable()
                  ->constrained('sermon_series')->nullOnDelete();
            $table->string('scripture_reference')->nullable();  // ex: "Jean 3:16"
            $table->date('sermon_date');                        // date de prédication

            $table->enum('type', ['audio', 'video', 'live_replay'])->default('video');
            $table->string('video_url')->nullable();            // hébergé sur S3 ou ext.
            $table->string('audio_url')->nullable();
            $table->string('youtube_url')->nullable();          // alt: lien YouTube
            $table->string('thumbnail')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();

            $table->unsignedBigInteger('views_count')->default(0);
            $table->boolean('is_featured')->default(false);     // mise en avant home
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index('title');
            $table->index('sermon_date');
            $table->index('type');
            $table->index('views_count');
            $table->index('is_featured');
            $table->index('is_published');
            $table->index('published_at');
            // Index composé : la requête publique la plus fréquente
            // ("sermons publiés triés par date") l'utilise.
            $table->index(['is_published', 'sermon_date']);
            $table->index('speaker_id');
            $table->index('series_id');

            // Recherche fulltext sur titre + description (MySQL uniquement).
            if (DB::connection()->getDriverName() === 'mysql') {
                $table->fullText(['title', 'description']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sermons');
    }
};
