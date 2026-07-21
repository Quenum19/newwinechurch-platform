<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute le support des photos brandées (compositing template).
 *
 * bal_photos :
 *  - path            → original brut (backup)
 *  - landscape_path  → version 16:9 avec branding (pour écran TV)
 *  - square_path     → version 1:1 avec fond flouté + branding (pour partage)
 *
 * events :
 *  - bal_template_landscape → PNG overlay custom (optionnel, sinon auto-généré)
 *  - bal_template_square    → idem carré
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bal_photos', function (Blueprint $table) {
            $table->string('landscape_path')->nullable()->after('path');
            $table->string('square_path')->nullable()->after('landscape_path');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('bal_template_landscape')->nullable()->after('cover_image');
            $table->string('bal_template_square')->nullable()->after('bal_template_landscape');
        });
    }

    public function down(): void
    {
        Schema::table('bal_photos', function (Blueprint $table) {
            $table->dropColumn(['landscape_path', 'square_path']);
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['bal_template_landscape', 'bal_template_square']);
        });
    }
};
