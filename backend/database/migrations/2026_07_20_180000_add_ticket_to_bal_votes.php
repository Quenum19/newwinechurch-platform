<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute event_ticket_id à bal_votes pour l'anti-triche fort :
 * 1 ticket = 1 vote max, impossible de contourner via cookies.
 *
 * L'ancien fingerprint reste comme couche de détection secondaire.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bal_votes', function (Blueprint $table) {
            $table->foreignId('event_ticket_id')
                  ->nullable()
                  ->after('event_id')
                  ->constrained('event_tickets')
                  ->nullOnDelete();

            // Contrainte unique : 1 seul vote par ticket + event.
            // MySQL n'applique pas l'unique sur NULL → OK pour rétrocompat
            // avec les votes existants qui n'ont pas de ticket associé.
            $table->unique(['event_id', 'event_ticket_id'], 'bal_votes_event_ticket_unique');
        });
    }

    public function down(): void
    {
        Schema::table('bal_votes', function (Blueprint $table) {
            $table->dropUnique('bal_votes_event_ticket_unique');
            $table->dropConstrainedForeignId('event_ticket_id');
        });
    }
};
