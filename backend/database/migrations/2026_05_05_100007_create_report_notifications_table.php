<?php

/**
 * Migration — Log des notifications envoyées suite à un rapport.
 *
 * Polymorphique : un report peut être un DepartmentReport ou un CellReport.
 * Permet de tracer qui a été notifié, sur quel canal, avec quel statut
 * (utile pour debug et conformité).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('report_notifications', function (Blueprint $table) {
            $table->id();

            // Polymorphique vers DepartmentReport ou CellReport.
            // On utilise un nom d'index court ('rn_morph') car MySQL limite à 64 caractères.
            $table->string('report_notifiable_type');
            $table->unsignedBigInteger('report_notifiable_id');
            $table->index(
                ['report_notifiable_type', 'report_notifiable_id'],
                'rn_morph_idx'
            );

            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->enum('channel', ['email', 'websocket', 'sms', 'push'])->default('email');
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();

            $table->timestamps();

            // === INDEX ===
            $table->index(['recipient_id', 'status']);
            $table->index(['channel', 'status']);
            $table->index('sent_at');
            // Note : morphs() crée déjà un index sur (report_notifiable_type, report_notifiable_id).
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_notifications');
    }
};
