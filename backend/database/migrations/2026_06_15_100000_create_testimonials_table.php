<?php

/**
 * Témoignages — vies transformées partagées par les membres.
 *
 * Affichés sur la page d'accueil dans une section dédiée (carrousel) UNIQUEMENT
 * s'il y en a au moins un publié. Le format supporte 3 modes :
 *   - Texte seul (citation + photo de la personne)
 *   - Vidéo uploadée (fichier mp4/webm/mov stocké chez nous)
 *   - Vidéo externe (URL YouTube/Vimeo en embed)
 *
 * On garde tous les modes car certains membres préfèrent l'écrit, d'autres la
 * vidéo, et certaines vidéos sont déjà sur YouTube — pas besoin de re-uploader.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);                  // ex: "Marianne"
            $table->unsignedTinyInteger('age')->nullable(); // ex: 24
            $table->string('role', 150)->nullable();      // ex: "Cellule Cocody", "Membre 2 ans"
            $table->string('location', 100)->nullable();  // ex: "Abidjan"
            $table->text('quote');                        // texte du témoignage
            $table->string('image_path')->nullable();     // photo de la personne (WebP)
            $table->string('video_path')->nullable();     // vidéo uploadée chez nous
            $table->string('video_url')->nullable();      // URL externe (YouTube embed)
            $table->string('thumbnail')->nullable();      // poster pour la vidéo
            $table->boolean('is_published')->default(false);
            $table->boolean('is_featured')->default(false); // mise en avant carrousel home
            $table->unsignedInteger('sort_order')->default(100);
            $table->foreignId('user_id')->nullable()
                  ->constrained('users')->nullOnDelete(); // si membre interne lié
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_published');
            $table->index('is_featured');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
