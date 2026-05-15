<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute pdf_path à department_reports.
 *
 * À la soumission, un Job génère le PDF officiel du rapport (DomPDF) et stocke
 * son chemin relatif (disk 'local' → storage/app/reports/...).
 * Le PDF est ensuite servi via endpoint admin/gouverneur (download).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('department_reports', function (Blueprint $table) {
            $table->string('pdf_path')->nullable()->after('review_comment');
            $table->timestamp('pdf_generated_at')->nullable()->after('pdf_path');
        });
    }

    public function down(): void
    {
        Schema::table('department_reports', function (Blueprint $table) {
            $table->dropColumn(['pdf_path', 'pdf_generated_at']);
        });
    }
};
