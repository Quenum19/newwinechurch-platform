<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bilingue FR/EN — Étape G (finalisation i18n).
 *
 * Stratégie : colonnes `*_en` NULL-ables à côté des colonnes FR existantes.
 * Le frontend fait fallback vers FR si EN vide. Le middleware SetLocaleFromHeader
 * bascule app()->getLocale() selon Accept-Language, puis les accessors
 * getDisplayXxxAttribute() choisissent la bonne langue.
 *
 * Couvre les 5 modèles restants à traduire (les autres sont soit techniques,
 * soit déjà bilingues via Department).
 */
return new class extends Migration {
    public function up(): void
    {
        // Events (billetterie live — URGENT)
        Schema::table('events', function (Blueprint $table) {
            $table->string('title_en', 200)->nullable()->after('title');
            $table->text('description_en')->nullable()->after('description');
            $table->string('location_en', 200)->nullable()->after('location');
        });

        // Types de tickets (Standard, VIP, etc.)
        Schema::table('event_ticket_types', function (Blueprint $table) {
            $table->string('name_en', 100)->nullable()->after('name');
            $table->text('description_en')->nullable()->after('description');
        });

        // Séries d'événements récurrents
        Schema::table('event_series', function (Blueprint $table) {
            $table->string('title_en', 200)->nullable()->after('title');
            $table->text('description_en')->nullable()->after('description');
        });

        // Sermons (title obligatoire, transcript pas nécessaire de traduire)
        Schema::table('sermons', function (Blueprint $table) {
            $table->string('title_en', 250)->nullable()->after('title');
            $table->text('description_en')->nullable()->after('description');
        });

        // Blog posts
        Schema::table('posts', function (Blueprint $table) {
            $table->string('title_en', 250)->nullable()->after('title');
            $table->text('excerpt_en')->nullable()->after('excerpt');
            $table->longText('content_en')->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['title_en', 'description_en', 'location_en']);
        });
        Schema::table('event_ticket_types', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'description_en']);
        });
        Schema::table('event_series', function (Blueprint $table) {
            $table->dropColumn(['title_en', 'description_en']);
        });
        Schema::table('sermons', function (Blueprint $table) {
            $table->dropColumn(['title_en', 'description_en']);
        });
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['title_en', 'excerpt_en', 'content_en']);
        });
    }
};
