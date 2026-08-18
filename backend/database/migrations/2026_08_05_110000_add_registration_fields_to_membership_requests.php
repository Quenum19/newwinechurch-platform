<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * === Champs additionnels pour le formulaire d'inscription générique ===
 *
 * Contexte Festi Grill '26 mais utile pour tous futurs events :
 *   - commune / quartier  → dispatch transport (13 communes Abidjan)
 *   - whatsapp            → colonne dédiée (avant : squattait "motivation")
 *   - attended_bal        → déclaratif "j'étais au Bal DNE"
 *   - registration_token  → magic-link pour l'étape 2 (choix montagne)
 *   - registration_step   → workflow : "pre" -> "chose" -> "ticketed"
 *
 * Aucun de ces champs n'est obligatoire au niveau DB — chaque event active
 * les champs qu'il veut via events.registration_form_config (JSON).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->string('commune', 80)->nullable()->after('city');
            $table->string('quartier', 120)->nullable()->after('commune');
            $table->string('whatsapp', 30)->nullable()->after('phone');
            $table->boolean('attended_bal')->default(false)->after('event_id');
            // Token magic-link (32 chars) pour re-accès à sa préinscription
            // → étape 2 choix montagne sans re-taper prénom/nom.
            $table->char('registration_token', 40)->nullable()->unique()->after('attended_bal');
            $table->enum('registration_step', ['pre', 'chose', 'ticketed'])
                  ->default('pre')->after('registration_token');

            $table->index('commune');
            $table->index('registration_step');
        });
    }

    public function down(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->dropIndex(['commune']);
            $table->dropIndex(['registration_step']);
            $table->dropColumn([
                'commune', 'quartier', 'whatsapp',
                'attended_bal', 'registration_token', 'registration_step',
            ]);
        });
    }
};
