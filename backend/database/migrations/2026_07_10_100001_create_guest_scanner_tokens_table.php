<?php

/**
 * Tokens magic-link pour scanners invités externes — Étape A.
 *
 * Cas d'usage : la respo Sécurité recrute 3 amis non-membres pour aider à
 * scanner les billets samedi soir. Elle génère 3 tokens depuis le dashboard,
 * copie le lien / l'envoie via WhatsApp. Chaque invité ouvre son lien sur
 * mobile → auto-loggué → accède UNIQUEMENT à la page scanner de cet event.
 *
 * Chaque token est adossé à un user "invité" (créé à la volée) pour que
 * chaque scan reste tracé (event_tickets.used_by_id).
 *
 *  - token       : chaîne secrète 64 chars, index unique
 *  - status      : active (défaut) / suspended (temporaire) / revoked (final)
 *  - expires_at  : fin_event + config('tickets.guest_scanner_token_ttl_after_event_hours')
 *  - scan_count  : incrémenté à chaque scan validé (audit léger)
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('guest_scanner_tokens', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            // User "invité" créé à la volée — permet audit trail sur les scans.
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('token', 64)->unique();

            // Identité fournie par le manager qui invite (pour l'affichage).
            $table->string('display_name', 120);
            $table->string('contact', 180)->nullable(); // email OU numéro tel
            $table->enum('contact_type', ['email', 'whatsapp'])->default('whatsapp');

            $table->enum('status', ['active', 'suspended', 'revoked'])
                  ->default('active');

            $table->timestamp('expires_at');

            $table->foreignId('created_by_id')->nullable()
                  ->constrained('users')->nullOnDelete();

            // Audit / stats.
            $table->timestamp('last_used_at')->nullable();
            $table->unsignedInteger('scan_count')->default(0);
            $table->ipAddress('last_ip')->nullable();

            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_scanner_tokens');
    }
};
