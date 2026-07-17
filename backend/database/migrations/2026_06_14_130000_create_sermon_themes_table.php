<?php

/**
 * Thèmes/tags des sermons — système de classification transverse.
 *
 * Pourquoi un table dédiée plutôt qu'un champ JSON ou un tags polymorphe ?
 *   - Recherche/filtrage rapide par index B-tree (vs FULLTEXT JSON)
 *   - Couleur par thème (UX badges)
 *   - Tag "par défaut" non supprimable (seed) — protège l'archivage long terme :
 *     dans 20 ans, un thème "prière" doit toujours exister, peu importe ce que
 *     l'admin a touché.
 *
 * Pivot many-to-many : un sermon peut couvrir plusieurs thèmes
 * ("famille" + "finances" + "responsabilité" pour un seul message).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sermon_themes', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();
            $table->string('name', 100);
            $table->string('description', 250)->nullable();
            // Couleur hex pour les badges (#RRGGBB). Fallback côté UI si null.
            $table->string('color', 7)->nullable();
            // is_default = thème seedé (officiel, non supprimable, slug protégé).
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(100);
            $table->timestamps();

            $table->index('is_default');
            $table->index('sort_order');
        });

        Schema::create('sermon_theme_sermon', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sermon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('theme_id')
                  ->constrained('sermon_themes')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['sermon_id', 'theme_id']);
            $table->index('theme_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sermon_theme_sermon');
        Schema::dropIfExists('sermon_themes');
    }
};
