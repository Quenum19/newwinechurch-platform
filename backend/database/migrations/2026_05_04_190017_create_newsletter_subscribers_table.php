<?php

/**
 * Migration 17 — Abonnés newsletter.
 *
 * Double-opt-in via token de confirmation. Ne pas envoyer
 * d'email tant que `is_confirmed` est faux (RGPD).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name')->nullable();
            $table->enum('language', ['fr', 'en'])->default('fr');

            $table->boolean('is_confirmed')->default(false);
            $table->string('confirmation_token', 64)->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('unsubscribed_at')->nullable();

            $table->timestamps();

            $table->index('is_confirmed');
            $table->index('unsubscribed_at');
            $table->index('language');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
    }
};
