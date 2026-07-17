<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 billetterie — Colonnes WhatsApp sur event_tickets.
 *
 * Tracking par ticket pour pouvoir :
 *  - Respecter le consentement (opt-in coché par défaut, l'inscrit peut décocher)
 *  - Auditer les envois (status delivered/read si webhook actif côté Meta)
 *  - Re-tenter si une notif a échoué
 *  - Lier au message_id Meta pour les callbacks de statut
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('event_tickets', function (Blueprint $table) {
            // Consentement — coché par défaut (l'inscrit a déjà donné son numéro pour l'inscription).
            $table->boolean('whatsapp_opt_in')->default(true)->after('phone');

            // Tracking dernier envoi (3 phases : inscription → tickets_ready → reminder J-1).
            $table->timestamp('whatsapp_sent_at')->nullable()->after('whatsapp_opt_in');
            $table->string('whatsapp_message_id', 100)->nullable()->after('whatsapp_sent_at');
            $table->string('whatsapp_last_status', 30)->nullable()->after('whatsapp_message_id'); // sent / delivered / read / failed
            $table->string('whatsapp_last_error', 255)->nullable()->after('whatsapp_last_status');

            $table->index(['event_id', 'whatsapp_opt_in']);
        });
    }

    public function down(): void
    {
        Schema::table('event_tickets', function (Blueprint $table) {
            $table->dropIndex(['event_id', 'whatsapp_opt_in']);
            $table->dropColumn([
                'whatsapp_opt_in', 'whatsapp_sent_at',
                'whatsapp_message_id', 'whatsapp_last_status', 'whatsapp_last_error',
            ]);
        });
    }
};
