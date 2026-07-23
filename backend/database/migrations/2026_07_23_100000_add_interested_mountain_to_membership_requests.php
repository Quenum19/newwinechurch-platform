<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Ajoute interested_mountain sur membership_requests.
 *
 * Les Montagnes = les 7 sphères d'influence de la Convention Kingdom
 * (Religion, Media, Gouvernement, Economie, Education, Famille, Art/Musique/Sport).
 *
 * Une demande d'enrôlement peut cibler :
 *   - un département (interested_department_id)
 *   - une montagne (interested_mountain, string slug)
 *   - ou les deux
 * Au moins l'un des deux est exigé côté controller.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->string('interested_mountain', 50)->nullable()->after('interested_department_id');
            $table->index('interested_mountain');
        });
    }

    public function down(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->dropIndex(['interested_mountain']);
            $table->dropColumn('interested_mountain');
        });
    }
};
