<?php

/**
 * Migration 15 — Galerie photos / vidéos publique.
 *
 * Distincte de Spatie MediaLibrary (qui gère les attachments des modèles) :
 * cette galerie est un module à part entière, alimenté manuellement
 * par les capitaines Média Photo / Vidéo.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media_gallery', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('description')->nullable();

            $table->string('file_path');                  // ex: media/2026/05/photo-001.webp
            $table->enum('file_type', ['image', 'video']);
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('thumbnail')->nullable();      // pour vidéos

            // Lien optionnel à un événement (pour album d'événement).
            $table->foreignId('event_id')->nullable()
                  ->constrained('events')->nullOnDelete();

            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->boolean('is_published')->default(true);

            $table->timestamps();

            // === INDEX ===
            $table->index('file_type');
            $table->index('event_id');
            $table->index('uploaded_by');
            $table->index('is_published');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_gallery');
    }
};
