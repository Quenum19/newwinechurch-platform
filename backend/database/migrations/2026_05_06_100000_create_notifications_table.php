<?php

/**
 * Migration — table `notifications` standard Laravel.
 *
 * Utilisée par le canal `database` de Laravel Notifications. C'est l'inbox
 * utilisateur exposée par GET /api/notifications. Distincte de
 * `report_notifications` (qui reste un log technique d'envoi par canal).
 *
 * Pour 1M+ users : index composés sur (notifiable_id, notifiable_type, read_at)
 * et sur created_at pour les filtres temps réel.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            // Morph manuel pour éviter un nom d'index trop long sur MySQL.
            $table->string('notifiable_type');
            $table->unsignedBigInteger('notifiable_id');
            $table->text('data'); // JSON payload Laravel.
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Index principal : recherche par destinataire + non-lues.
            $table->index(['notifiable_type', 'notifiable_id'], 'notifs_morph_idx');
            $table->index(['notifiable_id', 'read_at'], 'notifs_unread_idx');
            $table->index('created_at');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
