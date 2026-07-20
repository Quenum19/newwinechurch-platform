<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table `bal_votes` — votes anonymes Roi & Reine.
 *
 * Anti-triche via `voter_fingerprint` = sha256(ip + user_agent + cookie 'nwc_vote_id').
 * Un même fingerprint ne peut voter qu'une seule fois par event (unique).
 *
 * Les colonnes roi_candidate_id / reine_candidate_id sont indépendamment nullable :
 * l'électeur peut voter uniquement pour un roi, uniquement pour une reine, ou les deux.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('bal_votes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            $table->foreignId('roi_candidate_id')->nullable()
                  ->constrained('bal_candidates')->nullOnDelete();
            $table->foreignId('reine_candidate_id')->nullable()
                  ->constrained('bal_candidates')->nullOnDelete();

            // Hash anti-doublon (sha256 hex = 64 chars).
            $table->string('voter_fingerprint', 64);

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            // Un fingerprint ne peut voter qu'une fois par event.
            $table->unique(['event_id', 'voter_fingerprint'], 'bal_votes_event_fp_unique');

            // Index rapide pour la vérification "a déjà voté ?".
            $table->index('voter_fingerprint');

            // Index d'agrégation pour compter les votes par candidat.
            $table->index(['event_id', 'roi_candidate_id']);
            $table->index(['event_id', 'reine_candidate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bal_votes');
    }
};
