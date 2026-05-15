<?php

/**
 * Migration — Rapports périodiques des départements.
 *
 * Un gouverneur soumet un rapport structuré pour son département sur une
 * période donnée (hebdo, mensuel, trimestriel, annuel selon report_type).
 * form_data contient les réponses au template (variable selon dept).
 *
 * Workflow : draft → submitted → reviewed → approved / rejected.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('department_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('governor_id')->constrained('users')->restrictOnDelete();

            // Type libre piloté par template (ex: "monthly_activity", "annual_summary").
            $table->string('report_type', 60);
            $table->date('period_start');
            $table->date('period_end');

            // Réponses au formulaire (structure dépend du template).
            $table->json('form_data')->nullable();

            $table->enum('status', [
                'draft', 'submitted', 'reviewed', 'approved', 'rejected',
            ])->default('draft');

            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_comment')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index(['department_id', 'status', 'submitted_at']);
            $table->index(['governor_id', 'status']);
            $table->index(['period_start', 'period_end']);
            $table->index(['report_type', 'status']);
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_reports');
    }
};
