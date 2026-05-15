<?php

/**
 * Migration 11 — Dons (Mobile Money + cash).
 *
 * Workflow déclaratif : un don est créé en statut "pending" lorsque
 * l'utilisateur soumet le formulaire avec sa référence Mobile Money,
 * puis l'admin confirme manuellement après vérification du transfert.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('donations', function (Blueprint $table) {
            $table->id();

            // Donateur (nullable pour les dons anonymes).
            $table->foreignId('user_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->decimal('amount', 12, 2);                // jusqu'à 9 999 999 999.99
            $table->string('currency', 3)->default('XOF');   // Franc CFA

            $table->enum('method', [
                'orange_money', 'wave', 'mtn_momo',
                'card', 'cash', 'other',
            ]);

            // Référence du transfert Mobile Money saisie par le donateur.
            $table->string('reference')->nullable()->unique();

            $table->enum('type', ['tithe', 'offering', 'mission', 'building', 'other'])
                  ->default('offering');

            $table->enum('status', ['pending', 'completed', 'failed'])
                  ->default('pending');

            // Champs pour dons anonymes (sans compte).
            $table->string('donor_name')->nullable();
            $table->string('donor_phone', 30)->nullable();
            $table->text('note')->nullable();

            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->timestamps();

            // === INDEX ===
            $table->index('amount');
            $table->index('method');
            $table->index('type');
            $table->index('status');
            $table->index('created_at');
            $table->index(['user_id', 'status']);
            $table->index(['method', 'status']);
            $table->index(['status', 'created_at']); // dashboard admin "dons en attente"
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
