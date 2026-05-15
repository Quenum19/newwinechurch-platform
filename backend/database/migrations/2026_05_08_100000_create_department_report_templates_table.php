<?php

/**
 * Migration — Templates de rapport hebdomadaire/mensuel par département.
 *
 * Chaque département a son propre formulaire (Planning des Cultes ≠ Évangélisation
 * ≠ Finance). Le `schema` JSON décrit les champs (label, type, options, required,
 * placement). Versionning : on garde un seul template actif à la fois, mais
 * l'historique reste pour audit/migration des anciens rapports.
 *
 * Le rapport DepartmentReport.form_data stocke les réponses au template actif
 * au moment de la création du rapport.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('department_report_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // Périodicité : weekly (rapport hebdomadaire) ou monthly.
            $table->enum('frequency', ['weekly', 'monthly'])->default('weekly');
            // Schema JSON : tableau de sections, chaque section a un titre + des champs.
            // [{ title: 'Identité', fields: [{key, label, type, ...}] }, ...]
            $table->json('schema');
            $table->unsignedSmallInteger('version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['department_id', 'is_active']);
            $table->index(['department_id', 'frequency']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_report_templates');
    }
};
