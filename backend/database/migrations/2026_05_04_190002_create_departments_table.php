<?php

/**
 * Migration 02 — Table des départements (50 prévus, 39 actifs + 11 à pourvoir).
 *
 * Chaque département a un gouverneur (FK users, ancien "capitaine") et
 * regroupe des membres via la table pivot department_user. L'historique
 * complet des gouverneurs est tracé dans department_governors.
 *
 * Refonte Étape 1 : ajout de banner_image, profile_photo, color_theme,
 * vision, sort_order, founded_at, member_count_cache, is_active.
 * Le champ legacy `color` est conservé pour compatibilité (badge admin)
 * mais `color_theme` est le nouveau champ canonique pour la page publique.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // Ex: "Évangélisation"
            $table->string('slug')->unique();                // Ex: "evangelisation"
            $table->text('description')->nullable();
            $table->text('vision')->nullable();              // Vision/mission du département
            $table->string('icon', 50)->nullable();          // nom Lucide ou emoji
            $table->string('color', 7)->nullable();          // hex legacy (badge admin)
            $table->string('color_theme', 7)->nullable();    // hex canonique pour page publique
            $table->string('banner_image')->nullable();      // bannière hero page département
            $table->string('profile_photo')->nullable();     // photo principale (carré)

            // Gouverneur principal (cache — historique complet dans department_governors).
            $table->foreignId('governor_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->enum('status', ['active', 'pending'])
                  ->default('active');                       // pending = à pourvoir
            $table->boolean('is_active')->default(true);     // toggle on/off rapide
            $table->integer('display_order')->default(0);    // ordre legacy
            $table->integer('sort_order')->default(0);       // nouvel ordre canonique (page publique)
            $table->date('founded_at')->nullable();          // date de création du département

            // Cache du nombre de membres (mis à jour par job/observer pour éviter COUNT() à chaque requête).
            $table->unsignedInteger('member_count_cache')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index('name');
            $table->index('status');
            $table->index('is_active');
            $table->index('governor_id');
            $table->index('display_order');
            $table->index('sort_order');
            $table->index(['is_active', 'sort_order']); // listing public trié
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
