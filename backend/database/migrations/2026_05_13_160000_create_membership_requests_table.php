<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Demandes d'adhésion (membership requests).
 *
 * Modèle d'admission : un visiteur du site soumet une demande via /rejoindre.
 * Cette demande n'est PAS un compte fonctionnel. La RH/admin valide ensuite
 * depuis /admin/demandes-adhesion :
 *   - approve → crée un User actif avec mot de passe par défaut, envoie un email
 *   - reject  → met le statut à rejected (option : commentaire au demandeur)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('membership_requests', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80);
            $table->string('name', 80);
            $table->string('email', 180);
            $table->string('phone', 30)->nullable();
            $table->date('birth_date');
            $table->enum('gender', ['M', 'F'])->nullable();
            $table->string('city', 100)->nullable();
            $table->string('referrer', 120)->nullable(); // "Qui t'a invité ?" — utile à la RH
            $table->text('motivation')->nullable();       // mot facultatif du candidat

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // user créé après approbation

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_requests');
    }
};
