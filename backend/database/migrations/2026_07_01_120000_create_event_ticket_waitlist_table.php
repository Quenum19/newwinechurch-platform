<?php

/**
 * Liste d'attente — déclenchée quand la capacité d'un event est atteinte.
 * Position FIFO. Le bumping automatique (Phase 2) viendra plus tard.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_ticket_waitlist', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 180);
            $table->string('phone', 30)->nullable();
            $table->unsignedTinyInteger('quantity')->default(1); // si famille en attente
            $table->unsignedInteger('position');                  // calculé à l'insert
            $table->enum('status', ['waiting', 'promoted', 'cancelled'])->default('waiting');
            $table->timestamp('promoted_at')->nullable();
            $table->timestamps();

            // Un même email ne peut pas être 2x sur la même liste d'attente.
            $table->unique(['event_id', 'email']);
            $table->index(['event_id', 'status', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_ticket_waitlist');
    }
};
