<?php

/**
 * Migration 01 — Extension de la table users.
 *
 * Ajoute toutes les colonnes spécifiques aux membres NWC :
 * prénom, téléphone, avatar, infos personnelles, statut, baptême.
 *
 * Conserve les colonnes Laravel par défaut (id, name, email, password,
 * email_verified_at, remember_token, timestamps).
 *
 * Les colonnes liées à department_id / cell_id et flags gouverneur/leader
 * sont ajoutées par 2026_05_04_190100_extend_users_for_roles_and_scope.php,
 * qui doit s'exécuter APRÈS la création des tables departments et cells.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Champs de profil enrichi.
            $table->string('first_name')->nullable()->after('name');
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->date('birth_date')->nullable()->after('avatar');
            $table->enum('gender', ['M', 'F'])->nullable()->after('birth_date');
            $table->string('address')->nullable()->after('gender');
            $table->string('city', 100)->nullable()->after('address');
            $table->text('bio')->nullable()->after('city');

            // Statut du membre dans l'église (pending = en attente validation admin).
            $table->enum('status', ['active', 'inactive', 'pending'])
                  ->default('pending')->after('bio');

            // Baptisé ou non (utile pour cellules / engagement).
            $table->boolean('is_baptized')->default(false)->after('status');

            // Date d'arrivée à NWC (utile pour ancienneté).
            $table->date('joined_at')->nullable()->after('is_baptized');

            // Soft delete : on archive plutôt que supprimer (RGPD + historique).
            $table->softDeletes()->after('updated_at');

            // === INDEX pour requêtes fréquentes ===
            $table->index('phone');
            $table->index('status');
            $table->index(['status', 'created_at']); // pagination par statut + date
            $table->index('is_baptized');
            $table->index('city');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['phone']);
            $table->dropIndex(['status']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['is_baptized']);
            $table->dropIndex(['city']);
            $table->dropSoftDeletes();
            $table->dropColumn([
                'first_name', 'phone', 'avatar', 'birth_date', 'gender',
                'address', 'city', 'bio', 'status', 'is_baptized', 'joined_at',
            ]);
        });
    }
};
