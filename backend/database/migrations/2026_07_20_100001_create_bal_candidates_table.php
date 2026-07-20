<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table `bal_candidates` — candidats Roi & Reine du Bal.
 *
 * On stocke le rôle (roi | reine), une photo optionnelle et un ordre d'affichage
 * pour la page de vote publique + la slide "proclamation" de l'écran live.
 *
 * `is_active = false` permet de retirer un candidat sans supprimer ses votes.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('bal_candidates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            $table->enum('role', ['roi', 'reine']);

            $table->string('first_name', 80);
            $table->string('last_name', 80);

            // Chemin relatif dans storage/app/public/bal-candidates/.
            $table->string('photo_path', 255)->nullable();

            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['event_id', 'role', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bal_candidates');
    }
};
