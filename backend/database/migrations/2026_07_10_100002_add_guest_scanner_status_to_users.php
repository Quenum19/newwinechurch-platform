<?php

/**
 * Étend l'enum users.status avec 'guest_scanner' pour Étape C.
 *
 * Un guest_scanner :
 *  - Est un compte "invité" créé à la volée par magic-link
 *  - N'apparaît pas dans les listes de membres actifs (scope active)
 *  - Peut néanmoins se logger via son magic-link redeem
 *  - Est auto-nettoyable après l'événement (job d'hygiène Étape E)
 *
 * MySQL : modifier un enum se fait par ALTER TABLE MODIFY COLUMN.
 * PostgreSQL / SQLite : cross-DB neutre via une chaîne SQL brute.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Détection du driver pour compatibilité DEV (sqlite) / PROD (mysql).
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE users MODIFY COLUMN `status` "
                . "ENUM('active','inactive','pending','guest_scanner') "
                . "NOT NULL DEFAULT 'pending'"
            );
        }
        // Pour sqlite (tests locaux), l'enum est libre — pas d'ALTER nécessaire.
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            // Rollback : remet à l'ancien enum. Les rows guest_scanner
            // deviennent invalides — on les convertit en 'inactive'.
            DB::statement("UPDATE users SET status = 'inactive' WHERE status = 'guest_scanner'");
            DB::statement(
                "ALTER TABLE users MODIFY COLUMN `status` "
                . "ENUM('active','inactive','pending') "
                . "NOT NULL DEFAULT 'pending'"
            );
        }
    }
};
