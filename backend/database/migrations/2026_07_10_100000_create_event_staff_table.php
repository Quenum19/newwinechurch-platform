<?php

/**
 * Grants scopés à UN événement — Étape A rôles/permissions billetterie.
 *
 * Une ligne = un utilisateur possède un grant sur un événement précis.
 * Hiérarchie implicite : manager > scanner_lead > scanner.
 *
 *   - manager      : contrôle total de l'event (édition, liste, waitlist,
 *                    export, ajout staff, communication, scan).
 *   - scanner_lead : chef de scan (respo Sécurité auto sur tous les events).
 *                    Peut scanner + inviter/retirer des scanners externes.
 *   - scanner      : scanne uniquement + voit la liste inscrits en lecture.
 *
 * Un user ne peut avoir qu'UN seul grant par event (le plus élevé). Si on
 * veut le promouvoir, on update la ligne existante.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('event_staff', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->enum('grant', ['manager', 'scanner_lead', 'scanner'])
                  ->comment('Niveau d\'autorisation sur cet event précis.');

            $table->foreignId('assigned_by_id')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();

            // Révocation manuelle (bouton Retirer) OU auto post-event.
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by_id')->nullable()
                  ->constrained('users')->nullOnDelete();
            $table->string('revoke_reason', 120)->nullable();

            $table->timestamps();

            // Un user ne peut avoir qu'un grant par event.
            $table->unique(['event_id', 'user_id']);
            $table->index(['event_id', 'grant']);
            $table->index(['user_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_staff');
    }
};
