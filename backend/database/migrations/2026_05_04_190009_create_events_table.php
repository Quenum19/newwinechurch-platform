<?php

/**
 * Migration 09 — Événements (cultes spéciaux, prière, conférences...).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');

            $table->enum('type', [
                'culte', 'priere', 'evangelisation',
                'concert', 'formation', 'autre',
            ])->default('autre');

            $table->string('location')->nullable();
            $table->string('address')->nullable();

            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();

            $table->string('cover_image')->nullable();

            // Inscription : nullable = illimité ; required = formulaire obligatoire.
            $table->unsignedInteger('max_attendees')->nullable();
            $table->boolean('registration_required')->default(false);
            $table->timestamp('registration_deadline')->nullable();

            // Pour cultes en ligne (lien Zoom/YouTube/streaming).
            $table->boolean('is_online')->default(false);
            $table->string('online_link')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index('title');
            $table->index('starts_at');
            $table->index('type');
            $table->index('is_featured');
            $table->index('is_published');
            $table->index(['is_published', 'starts_at']); // listing public à venir
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
