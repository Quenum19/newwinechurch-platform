<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 6 billetterie — Colonnes refund sur event_tickets.
 *
 * Ajoute aussi 'refunded' à l'enum payment_status (Phase 2 énumérait :
 * free/pending/paid/refused/expired).
 *
 * Workflow :
 *  paid (Phase 2)  →  refunded (Phase 6)  + status='cancelled'
 *  free/pending    →  cancelled directement (pas de refund, juste cancel)
 *
 * On track la transaction sortante Mobile Money (mêmes champs que la transaction
 * entrante côté Phase 2) pour l'audit comptable.
 */
return new class extends Migration {
    public function up(): void
    {
        // Étend l'enum payment_status pour accepter 'refunded'.
        // SQL natif : ALTER TABLE … MODIFY COLUMN avec la nouvelle liste.
        DB::statement("
            ALTER TABLE event_tickets
            MODIFY COLUMN payment_status ENUM('free','pending','paid','refused','expired','refunded')
            NOT NULL DEFAULT 'free'
        ");

        Schema::table('event_tickets', function (Blueprint $table) {
            // Idempotent : on ne re-crée pas une colonne déjà présente.
            if (! Schema::hasColumn('event_tickets', 'refunded_at')) {
                $table->timestamp('refunded_at')->nullable()->after('payment_expires_at');
            }
            if (! Schema::hasColumn('event_tickets', 'refunded_by_id')) {
                $table->foreignId('refunded_by_id')->nullable()->after('refunded_at')
                      ->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('event_tickets', 'refund_reason')) {
                $table->string('refund_reason', 255)->nullable()->after('refunded_by_id');
            }
            if (! Schema::hasColumn('event_tickets', 'refund_method')) {
                $table->string('refund_method', 30)->nullable()->after('refund_reason');
            }
            if (! Schema::hasColumn('event_tickets', 'refund_reference')) {
                $table->string('refund_reference', 80)->nullable()->after('refund_method');
            }
            if (! Schema::hasColumn('event_tickets', 'refund_amount_fcfa')) {
                $table->unsignedInteger('refund_amount_fcfa')->nullable()->after('refund_reference');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_tickets', function (Blueprint $table) {
            $table->dropForeign(['refunded_by_id']);
            $table->dropColumn([
                'refunded_at', 'refunded_by_id',
                'refund_reason', 'refund_method', 'refund_reference', 'refund_amount_fcfa',
            ]);
        });

        DB::statement("
            ALTER TABLE event_tickets
            MODIFY COLUMN payment_status ENUM('free','pending','paid','refused','expired')
            NOT NULL DEFAULT 'free'
        ");
    }
};
