<?php

/**
 * Migration 190100 — Extension users : scope département/cellule, flags rôle.
 *
 * Doit s'exécuter APRÈS la création de departments et cells (190002, 190004)
 * pour pouvoir poser les FK.
 *
 * Ajoute :
 *  - department_id, cell_id  : cache d'appartenance principale
 *  - is_governor, is_cell_leader : flags pour requêtes scoped rapides
 *  - last_active_at          : tracking engagement
 *  - notification_preferences : JSON canaux activés par module
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Département principal (cache — vrai pivot dans department_user).
            $table->foreignId('department_id')->nullable()->after('joined_at')
                  ->constrained('departments')->nullOnDelete();

            // Cellule principale (cache — vrai pivot dans cell_user).
            $table->foreignId('cell_id')->nullable()->after('department_id')
                  ->constrained('cells')->nullOnDelete();

            // Flags cache pour scoping rapide (un user peut être gouverneur ET leader).
            $table->boolean('is_governor')->default(false)->after('cell_id');
            $table->boolean('is_cell_leader')->default(false)->after('is_governor');

            // Dernière activité (middleware met à jour, utile pour stats engagement).
            $table->timestamp('last_active_at')->nullable()->after('is_cell_leader');

            // Préférences notifications : { reports: {email:true, push:false}, ... }
            // Le default {} demandé par le prompt est fourni par l'accesseur du modèle
            // User (cross-DB : MySQL et SQLite ne partagent pas la même syntaxe pour
            // un default JSON expression).
            $table->json('notification_preferences')->nullable()->after('last_active_at');

            // === INDEX ===
            $table->index('department_id');
            $table->index('cell_id');
            $table->index('is_governor');
            $table->index('is_cell_leader');
            $table->index('last_active_at');
            $table->index(['is_governor', 'department_id']); // scope rapide
            $table->index(['is_cell_leader', 'cell_id']);    // scope rapide
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropForeign(['cell_id']);
            $table->dropIndex(['department_id']);
            $table->dropIndex(['cell_id']);
            $table->dropIndex(['is_governor']);
            $table->dropIndex(['is_cell_leader']);
            $table->dropIndex(['last_active_at']);
            $table->dropIndex(['is_governor', 'department_id']);
            $table->dropIndex(['is_cell_leader', 'cell_id']);
            $table->dropColumn([
                'department_id', 'cell_id', 'is_governor', 'is_cell_leader',
                'last_active_at', 'notification_preferences',
            ]);
        });
    }
};
