<?php

/**
 * Tickets émis pour un événement.
 *
 *  - 1 ligne = 1 PERSONNE = 1 QR (même si plusieurs tickets en 1 commande)
 *  - order_code  : groupe les tickets d'une même commande (ex: TBBLDXLJTEF)
 *  - ticket_number : numéro long unique de la ligne (15 digits, style Tikerama)
 *  - short_code  : code court humain (NWC-7H4K) pour saisie manuelle au scan
 *  - qr_payload  : la donnée brute signée HMAC stockée dans le QR
 *
 * Indexation pensée pour les requêtes les plus fréquentes :
 *  - lookup par order_code (l'inscrit veut voir tous ses tickets)
 *  - lookup par short_code (agent qui tape à la main)
 *  - filtre par event_id + status (dashboard org)
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            // Identifiants
            $table->string('order_code', 16)->index();                   // TBBLDXLJTEF
            $table->string('ticket_number', 20)->unique();               // 748962213265674
            $table->string('short_code', 12)->unique();                  // NWC-7H4K
            $table->text('qr_payload');                                  // signé HMAC, payload du QR

            // Token public pour /mon-ticket/{token} (différent du short_code volontairement)
            $table->string('access_token', 64)->unique();

            // Identité de la personne (le HOLDER du ticket, pas l'acheteur si bulk)
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 180)->index();
            $table->string('phone', 30)->nullable();
            $table->string('selfie_path')->nullable();                   // option anti-revente

            // Statut + traçabilité scan
            $table->enum('status', ['confirmed', 'used', 'cancelled', 'waitlist'])
                  ->default('confirmed');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by_id')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->ipAddress('scan_ip')->nullable();

            // Si l'email correspond à un membre interne → lien optionnel
            $table->foreignId('linked_user_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index('used_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_tickets');
    }
};
