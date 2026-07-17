<?php

/**
 * Active la billetterie sur les événements existants.
 *
 *  - ticketing_enabled       : interrupteur (par défaut false → ancien comportement intact)
 *  - tickets_per_email_max   : combien de tickets max une même personne peut prendre
 *  - tickets_capacity        : capacité totale (alias clair de max_attendees pour ce module)
 *  - tickets_closes_at       : deadline d'inscription (peut être différente de starts_at)
 *  - require_selfie          : option anti-revente par event
 *  - allow_waitlist          : ouvre une liste d'attente quand sold out
 *  - support_phone           : numéro local affiché sur le ticket PDF (FAQ Tikerama-style)
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->boolean('ticketing_enabled')->default(false)->after('is_published');
            $table->unsignedTinyInteger('tickets_per_email_max')->default(3)->after('ticketing_enabled');
            $table->unsignedInteger('tickets_capacity')->nullable()->after('tickets_per_email_max');
            $table->timestamp('tickets_closes_at')->nullable()->after('tickets_capacity');
            $table->boolean('require_selfie')->default(false)->after('tickets_closes_at');
            $table->boolean('allow_waitlist')->default(true)->after('require_selfie');
            $table->string('support_phone', 30)->nullable()->after('allow_waitlist');

            $table->index('ticketing_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'ticketing_enabled', 'tickets_per_email_max', 'tickets_capacity',
                'tickets_closes_at', 'require_selfie', 'allow_waitlist', 'support_phone',
            ]);
        });
    }
};
