<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Extension cell_reports pour parité avec department_reports :
 *  - Élargir status enum : ajoute 'approved' et 'rejected'
 *  - Colonnes pdf_path + pdf_generated_at
 *
 * Sur MySQL : pour modifier un enum, on utilise un ALTER TABLE statement brut
 * (Doctrine DBAL ne gère pas bien les ENUMs Laravel).
 * Sur SQLite (tests) : pas d'enum réel, donc raw SQL skipped (la valeur
 * approved passe directement via le string).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('cell_reports', function (Blueprint $table) {
            $table->string('pdf_path')->nullable()->after('review_comment');
            $table->timestamp('pdf_generated_at')->nullable()->after('pdf_path');
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE cell_reports MODIFY COLUMN status ENUM('draft', 'submitted', 'reviewed', 'approved', 'rejected') NOT NULL DEFAULT 'draft'");
        }
    }

    public function down(): void
    {
        Schema::table('cell_reports', function (Blueprint $table) {
            $table->dropColumn(['pdf_path', 'pdf_generated_at']);
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE cell_reports MODIFY COLUMN status ENUM('draft', 'submitted', 'reviewed') NOT NULL DEFAULT 'draft'");
        }
    }
};
