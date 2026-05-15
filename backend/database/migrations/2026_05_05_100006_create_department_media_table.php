<?php

/**
 * Migration — Médias liés à un département (photos/vidéos d'activités).
 *
 * Une photo/vidéo est attachée à un département, optionnellement liée à
 * un événement. Permet d'alimenter la galerie publique de la page département
 * sans dupliquer le système media_gallery général.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('department_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->nullable()
                  ->constrained('events')->nullOnDelete();

            $table->enum('media_type', ['photo', 'video'])->default('photo');
            $table->string('file_path');
            $table->string('thumbnail_path')->nullable();
            $table->string('caption')->nullable();

            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedBigInteger('views_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index(['department_id', 'media_type']);
            $table->index(['department_id', 'is_featured']);
            $table->index(['department_id', 'sort_order']);
            $table->index('event_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_media');
    }
};
