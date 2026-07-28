<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optimisations galerie post-événement (phase perf) :
 *
 *  1. events.brand_frames — JSON pointant vers les 4 PNG overlay de l'event
 *     ({ tv: "frames/foo-tv.png", story: "...", ... }). Rend les cadres
 *     génériques : plus de hardcoding "dark-night-*". Fallback = frames
 *     "dark-night-*" livrées par défaut.
 *
 *  2. media_downloads — analytics légères : quelle photo est téléchargée,
 *     dans quel format, à quelle fréquence. ip_hash (SHA1) pour respecter
 *     la vie privée tout en dédupliquant les vraies distinct visits.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // JSON nullable : si null, on utilise les frames par défaut.
            $table->json('brand_frames')->nullable()->after('cover_image');
        });

        Schema::create('media_downloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_id')->constrained('media_gallery')->cascadeOnDelete();
            $table->foreignId('event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->string('format', 16)->default('auto');
            $table->char('ip_hash', 40)->nullable(); // sha1(ip) pour privacy
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('downloaded_at')->useCurrent();

            $table->index(['media_id', 'downloaded_at']);
            $table->index(['event_id', 'downloaded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_downloads');
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('brand_frames');
        });
    }
};
