<?php

/**
 * Migration 12 — Demandes de prière.
 *
 * Une demande peut être soumise par un membre connecté ou un visiteur
 * anonyme. Certaines sont publiées sur le mur de prière communautaire,
 * d'autres restent confidentielles (admin uniquement).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prayer_requests', function (Blueprint $table) {
            $table->id();

            // Si soumise par un user connecté.
            $table->foreignId('user_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            // Si soumise par un visiteur anonyme.
            $table->string('name')->nullable();
            $table->string('email')->nullable();

            $table->text('request');
            $table->enum('category', [
                'health', 'family', 'work', 'finance', 'spiritual', 'other',
            ])->default('other');

            $table->boolean('is_anonymous')->default(false);    // afficher anonyme
            $table->boolean('is_answered')->default(false);     // témoignage exhausé
            $table->boolean('is_published')->default(false);    // visible publiquement

            $table->unsignedInteger('prayed_by_count')->default(0);
            $table->text('admin_note')->nullable();

            $table->timestamps();

            // === INDEX ===
            $table->index('category');
            $table->index('is_published');
            $table->index('is_answered');
            $table->index(['is_published', 'created_at']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prayer_requests');
    }
};
