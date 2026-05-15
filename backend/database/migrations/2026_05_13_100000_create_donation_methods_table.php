<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Opérateurs / méthodes de paiement (annuaire affichage Donner).
 *
 * La table existante `donations.method` reste une ENUM (orange_money, wave,
 * mtn_momo, card, cash, other) pour les stats. CETTE TABLE est un annuaire
 * d'affichage uniquement : numéros à composer, logos, instructions par
 * opérateur. L'admin peut ajouter / modifier sans toucher au code.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('donation_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);                  // ex: "Orange Money"
            $table->string('code', 50)->unique();         // ex: "orange_money" (machine)
            $table->string('account_number', 30)->nullable(); // ex: "+225 07 12 34 56 78"
            $table->string('recipient_name', 120)->nullable(); // ex: "NEW WINE CHURCH"
            $table->string('logo_path', 255)->nullable();      // chemin storage public
            $table->string('color_hex', 7)->nullable();        // teinte (badge couleur)
            $table->text('instructions')->nullable();          // étapes à suivre
            $table->string('ussd_code', 50)->nullable();       // ex: "#144#"
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donation_methods');
    }
};
