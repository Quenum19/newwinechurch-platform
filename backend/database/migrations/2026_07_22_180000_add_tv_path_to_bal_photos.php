<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Ajoute tv_path sur bal_photos pour la version TV 16:9
 * (1920x1080) utilisée par la slide écran live full écran.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('bal_photos', function (Blueprint $table) {
            $table->string('tv_path')->nullable()->after('landscape_path');
        });
    }

    public function down(): void
    {
        Schema::table('bal_photos', function (Blueprint $table) {
            $table->dropColumn('tv_path');
        });
    }
};
