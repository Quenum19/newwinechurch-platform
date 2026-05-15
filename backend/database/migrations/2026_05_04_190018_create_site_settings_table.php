<?php

/**
 * Migration 18 — Paramètres dynamiques du site (clé/valeur).
 *
 * Permet à l'admin de modifier sans déployer :
 *  - logos NWC + Maison de la Destinée
 *  - numéros Mobile Money (Orange Money, Wave, MTN MoMo)
 *  - liens réseaux sociaux
 *  - email de contact, adresse, horaires
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->enum('type', ['text', 'image', 'boolean', 'json'])
                  ->default('text');
            $table->string('group', 50)->nullable();   // ex: "social", "donation"
            $table->foreignId('updated_by')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('group');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
