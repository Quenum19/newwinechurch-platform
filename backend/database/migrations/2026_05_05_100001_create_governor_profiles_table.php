<?php

/**
 * Migration — Profils enrichis des gouverneurs.
 *
 * Un gouverneur est un utilisateur (rôle gouverneur) avec un profil étendu :
 * photo dédiée gouverneur (peut différer de l'avatar), bannière, biographie,
 * vision, téléphone direct. Lien 1-1 avec users.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('governor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()
                  ->constrained()->cascadeOnDelete();

            $table->string('photo_profile')->nullable();   // photo officielle (carré)
            $table->string('banner_image')->nullable();    // bannière de profil (16:9)
            $table->text('bio')->nullable();
            $table->string('phone_direct', 30)->nullable(); // ligne directe (peut différer de users.phone)
            $table->unsignedSmallInteger('years_in_role')->default(0);
            $table->text('vision_statement')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('governor_profiles');
    }
};
