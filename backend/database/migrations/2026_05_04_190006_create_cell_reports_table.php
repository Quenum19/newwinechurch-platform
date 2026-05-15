<?php

/**
 * Migration 06 — Rapports hebdomadaires de cellules (refonte Étape 1).
 *
 * Chaque semaine, le leader saisit un rapport structuré :
 *  - chiffres (présence, nouveaux membres)
 *  - sujets de prière (JSON, structuré)
 *  - activités (JSON, structuré)
 *  - défis et points forts (texte libre)
 *  - flag de suivi nécessaire
 *
 * Renommages legacy :
 *   attendees_count → attendance_count
 *   new_converts    → new_members
 *   reported_by     → leader_id
 *   testimony       → fusionné dans highlights
 *   prayer_requests text → JSON
 *
 * Workflow : draft → submitted → reviewed.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cell_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cell_id')->constrained()->cascadeOnDelete();
            $table->foreignId('leader_id')->constrained('users')->restrictOnDelete();

            // Lundi de la semaine concernée (clé naturelle pour éviter les doublons).
            $table->date('week_start');
            // Dimanche correspondant (cache pratique pour filtres période).
            $table->date('week_end');

            $table->unsignedInteger('attendance_count')->default(0);
            $table->unsignedInteger('new_members')->default(0);

            // Sujets de prière structurés : [{title, requester, urgency}, ...]
            $table->json('prayer_requests')->nullable();
            // Activités de la semaine : [{type, description, date, count}, ...]
            $table->json('activities')->nullable();

            $table->text('challenges')->nullable();
            $table->text('highlights')->nullable();         // témoignages + faits marquants
            $table->boolean('needs_followup')->default(false);

            // Workflow : draft → submitted → reviewed.
            $table->enum('status', ['draft', 'submitted', 'reviewed'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_comment')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            // Une seule cellule + semaine = un rapport unique.
            $table->unique(['cell_id', 'week_start']);
            $table->index(['cell_id', 'week_start', 'status']);
            $table->index(['leader_id', 'status']);
            $table->index(['status', 'submitted_at']);
            $table->index('needs_followup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cell_reports');
    }
};
