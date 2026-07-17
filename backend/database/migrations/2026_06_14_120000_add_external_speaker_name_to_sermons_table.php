<?php

/**
 * Permet de saisir un prédicateur externe (invité, pasteur d'une autre
 * église, etc.) qui n'a pas de compte dans la table users.
 *
 * Règle d'usage :
 *   - speaker_id défini  → prédicateur = membre interne (relation users)
 *   - external_speaker_name défini → prédicateur invité, texte libre
 *   - Les deux sont mutuellement exclusifs côté UX (la Resource priorise
 *     speaker_id si présent).
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sermons', function (Blueprint $table) {
            $table->string('external_speaker_name', 150)
                  ->nullable()
                  ->after('speaker_id');
        });
    }

    public function down(): void
    {
        Schema::table('sermons', function (Blueprint $table) {
            $table->dropColumn('external_speaker_name');
        });
    }
};
