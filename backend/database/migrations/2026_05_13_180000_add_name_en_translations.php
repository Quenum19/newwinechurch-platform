<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Traductions EN pour les contenus courts répétitifs.
 *
 * Stratégie pragmatique : on AJOUTE des colonnes `*_en` à côté des colonnes
 * FR existantes. Si la colonne EN est NULL, le frontend fait fallback vers FR.
 * Couvre uniquement les libellés très visibles qui méritent traduction.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->string('name_en', 120)->nullable()->after('name');
            $table->text('description_en')->nullable()->after('description');
        });

        Schema::table('post_categories', function (Blueprint $table) {
            $table->string('name_en', 80)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'description_en']);
        });

        Schema::table('post_categories', function (Blueprint $table) {
            $table->dropColumn('name_en');
        });
    }
};
