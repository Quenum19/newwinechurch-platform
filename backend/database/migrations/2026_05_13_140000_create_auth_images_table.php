<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Images affichées sur le hero des pages auth (connexion/inscription).
 *
 * Le superadmin ajoute / supprime des images via /admin/images-auth.
 * Le frontend récupère la liste active et en choisit une au hasard à chaque
 * affichage des pages auth.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('auth_images', function (Blueprint $table) {
            $table->id();
            $table->string('title', 160)->nullable();
            $table->string('path', 255);                   // chemin storage public
            $table->string('verse_ref', 60)->nullable();   // ex: "Matthieu 5:13-14"
            $table->text('verse_text')->nullable();        // verset à afficher en overlay
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_images');
    }
};
