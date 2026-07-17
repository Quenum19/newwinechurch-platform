<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 billetterie — Colonnes paiement sur event_tickets.
 *
 * Rétro-compatible Phase 1 : un ticket gratuit garde payment_status='free' et
 * son comportement reste identique (émission immédiate, scan, etc.).
 *
 * Cycle d'un ticket payant :
 *  pending  →  paid  (validation admin-site)  →  used  (scan entrée)
 *           →  refused  (refus admin)
 *           →  expired  (cron 24h sans validation)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('event_tickets', function (Blueprint $table) {
            $table->foreignId('ticket_type_id')->nullable()->after('event_id')
                  ->constrained('event_ticket_types')->nullOnDelete();

            $table->unsignedInteger('price_fcfa')->default(0)->after('phone');

            // Statut paiement — orthogonal au statut "présentiel" (confirmed/used/cancelled/waitlist).
            // Free = créé gratuit, équivalent paid pour les sortes (émis tout de suite).
            $table->enum('payment_status', ['free', 'pending', 'paid', 'refused', 'expired'])
                  ->default('free')->after('status');

            // Code de la donation_method utilisée (orange_money/wave/mtn_momo/moov_money).
            $table->string('payment_method', 30)->nullable()->after('payment_status');
            // Référence transaction fournie par l'inscrit (numéro reçu Mobile Money).
            $table->string('payment_reference', 80)->nullable()->after('payment_method');
            // Preuve uploadée (screenshot reçu) — optionnel mais recommandé.
            $table->string('payment_proof_path', 255)->nullable()->after('payment_reference');

            // Validation
            $table->timestamp('payment_validated_at')->nullable()->after('payment_proof_path');
            $table->foreignId('payment_validated_by_id')->nullable()
                  ->after('payment_validated_at')
                  ->constrained('users')->nullOnDelete();
            $table->string('payment_refusal_reason', 255)->nullable()->after('payment_validated_by_id');

            // Expiration auto (24h après création pour les tickets payants).
            $table->timestamp('payment_expires_at')->nullable()->after('payment_refusal_reason');

            $table->index(['event_id', 'payment_status']);
            $table->index('payment_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('event_tickets', function (Blueprint $table) {
            $table->dropForeign(['ticket_type_id']);
            $table->dropForeign(['payment_validated_by_id']);
            $table->dropIndex(['event_id', 'payment_status']);
            $table->dropIndex(['payment_expires_at']);
            $table->dropColumn([
                'ticket_type_id', 'price_fcfa', 'payment_status', 'payment_method',
                'payment_reference', 'payment_proof_path', 'payment_validated_at',
                'payment_validated_by_id', 'payment_refusal_reason', 'payment_expires_at',
            ]);
        });
    }
};
