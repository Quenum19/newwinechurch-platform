<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trace les groupes de doublons marqués "vérifié — pas un doublon" par un admin.
 *
 * Ces groupes ne seront plus affichés dans la liste des doublons potentiels
 * (mais restent auditables). Utile pour éviter que la même paire suspecte
 * revienne à chaque consultation après vérification humaine.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_ticket_duplicate_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            // Hash unique des ticket_ids du groupe (trié) — ex: sha1("12,34,56")
            $table->string('group_hash', 40)->index();
            // Sérialisation des ticket_ids du groupe pour audit (JSON array).
            $table->json('ticket_ids');
            $table->foreignId('verified_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('verified_at');
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'group_hash'], 'ticket_dup_verif_event_hash_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_ticket_duplicate_verifications');
    }
};
