<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 7 billetterie — Mode de paiement + tracking gateway.
 *
 * events.payment_mode :
 *   - declarative : Phase 2 — inscrit envoie Mobile Money, admin valide manuellement
 *   - cinetpay    : Phase 7 — bouton "Payer", CinetPay encaisse, webhook auto-valide
 *
 * Backward-compat absolue : default 'declarative', les events Phases 1-6 sont
 * inchangés.
 *
 * event_tickets.gateway_* :
 *   - provider : nom du driver ('cinetpay', 'wave', etc.) — null pour declarative
 *   - transaction_id : ID externe de la transaction (notre order_code envoyé à CinetPay)
 *   - payload : dump JSON de la dernière réponse webhook pour audit
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->enum('payment_mode', ['declarative', 'cinetpay'])
                  ->default('declarative')
                  ->after('support_phone');
        });

        Schema::table('event_tickets', function (Blueprint $table) {
            $table->string('gateway_provider', 30)->nullable()->after('payment_proof_path');
            $table->string('gateway_transaction_id', 80)->nullable()->after('gateway_provider');
            $table->json('gateway_payload')->nullable()->after('gateway_transaction_id');

            $table->index('gateway_transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('event_tickets', function (Blueprint $table) {
            $table->dropIndex(['gateway_transaction_id']);
            $table->dropColumn(['gateway_provider', 'gateway_transaction_id', 'gateway_payload']);
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('payment_mode');
        });
    }
};
