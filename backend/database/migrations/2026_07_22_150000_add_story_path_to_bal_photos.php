<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Ajoute story_path sur bal_photos pour la version Story 9:16
 * (1080x1920) générée par le composer avec le cadre Dark Night vertical.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('bal_photos', function (Blueprint $table) {
            $table->string('story_path')->nullable()->after('square_path');
        });
    }

    public function down(): void
    {
        Schema::table('bal_photos', function (Blueprint $table) {
            $table->dropColumn('story_path');
        });
    }
};
