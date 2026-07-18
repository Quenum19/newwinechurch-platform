<?php

/**
 * Sprint B — Préférences notif utilisateur + flags idempotence billetterie.
 *
 * 1. Table `user_notification_preferences` : chaque user peut activer/désactiver
 *    certaines notifs listées dans config('notifications.preferences').
 *    Les notifications critiques (anomalie sécurité) ignorent cette table.
 *
 * 2. Colonnes idempotence sur `events` :
 *      - alert_80_sent_at / alert_95_sent_at : anti-réémission palier capacité
 *      - reminders_j1_sent_at                : anti-doublon rappel J-1
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Ex: "digest_quotidien", "alerte_capacite" — matche
            // config('notifications.preferences') keys.
            $table->string('notification_key', 60);
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            // 1 seule ligne par (user, key).
            $table->unique(['user_id', 'notification_key'], 'unpref_user_key_unique');
        });

        Schema::table('events', function (Blueprint $table) {
            // 3. Alertes capacité — paliers 80 / 95 %.
            $table->timestamp('alert_80_sent_at')->nullable()->after('support_phone');
            $table->timestamp('alert_95_sent_at')->nullable()->after('alert_80_sent_at');
            // 5. Idempotence rappel J-1.
            $table->timestamp('reminders_j1_sent_at')->nullable()->after('alert_95_sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'alert_80_sent_at',
                'alert_95_sent_at',
                'reminders_j1_sent_at',
            ]);
        });
    }
};
