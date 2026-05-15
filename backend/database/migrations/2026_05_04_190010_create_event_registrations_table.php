<?php

/**
 * Migration 10 — Inscriptions aux événements.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->enum('status', ['registered', 'attended', 'cancelled'])
                  ->default('registered');
            $table->text('notes')->nullable();
            $table->timestamp('registered_at')->useCurrent();

            $table->timestamps();

            // Un user ne peut s'inscrire qu'une seule fois à un événement.
            $table->unique(['event_id', 'user_id']);
            $table->index('status');
            $table->index('event_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
    }
};
