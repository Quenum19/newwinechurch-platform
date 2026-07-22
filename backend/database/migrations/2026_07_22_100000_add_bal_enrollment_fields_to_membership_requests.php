<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Champs enrôlement bal 2026 sur membership_requests.
 *
 * Contexte : le bal du 24 juillet 2026 distribue un QR "Suis-nous" qui ouvre
 * un hub avec un CTA "Rejoindre la NWC". Ce formulaire écrit dans la même
 * table que les demandes d'adhésion classiques pour que l'accueil traite
 * tout au même endroit, mais on trace :
 *   - source          → 'bal-2026' pour filtrer/badger côté admin
 *   - enrollment_type → 'discover' (curieux) OU 'department' (veut servir)
 *   - interested_department_id → département cible si 'department'
 *
 * On rend aussi birth_date et email nullable : la nuit du bal, on ne demande
 * QUE l'essentiel (prénom, nom, tel). L'accueil recontacte pour compléter.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->string('source', 50)->nullable()->after('motivation');
            $table->enum('enrollment_type', ['discover', 'department'])->nullable()->after('source');
            $table->foreignId('interested_department_id')->nullable()->after('enrollment_type')
                ->constrained('departments')->nullOnDelete();

            $table->index('source');
        });

        // Rend birth_date et email nullable pour le flux enrôlement soft (bal).
        // Les demandes classiques /rejoindre gardent la validation stricte côté controller.
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->date('birth_date')->nullable()->change();
            $table->string('email', 180)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->dropForeign(['interested_department_id']);
            $table->dropIndex(['source']);
            $table->dropColumn(['source', 'enrollment_type', 'interested_department_id']);
        });

        Schema::table('membership_requests', function (Blueprint $table) {
            $table->date('birth_date')->nullable(false)->change();
            $table->string('email', 180)->nullable(false)->change();
        });
    }
};
