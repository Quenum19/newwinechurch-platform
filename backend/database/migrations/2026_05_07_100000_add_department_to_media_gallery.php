<?php

/**
 * Migration — Filtrage galerie publique par département.
 *
 * Étape 5/5 : la page publique d'un département expose ses activités
 * (photos/vidéos). On ajoute un FK direct sur media_gallery plutôt que
 * d'utiliser department_media (table Étape 1 réservée à un futur usage
 * admin enrichi avec featured/sort_order).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('media_gallery', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('event_id')
                  ->constrained('departments')->nullOnDelete();
            $table->boolean('is_featured')->default(false)->after('is_published');
            $table->unsignedInteger('sort_order')->default(0)->after('is_featured');

            // === INDEX ===
            $table->index('department_id');
            $table->index(['department_id', 'is_published']);
            $table->index(['department_id', 'is_featured']);
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('media_gallery', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropIndex(['department_id']);
            $table->dropIndex(['department_id', 'is_published']);
            $table->dropIndex(['department_id', 'is_featured']);
            $table->dropIndex(['sort_order']);
            $table->dropColumn(['department_id', 'is_featured', 'sort_order']);
        });
    }
};
