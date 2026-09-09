<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute latitude / longitude à membership_requests pour permettre le
 * géocodage précis (commune + quartier via Nominatim OSM) plutôt que le
 * clustering au centroïde de commune.
 *
 * geocoded_at : timestamp du dernier essai (succès OU échec) — évite de
 * ré-appeler l'API pour une adresse déjà tentée.
 * geocoded_source : "nominatim" | "manual" | null — sait d'où vient le point.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('membership_requests', function (Blueprint $t) {
            $t->decimal('latitude',  10, 7)->nullable()->after('quartier');
            $t->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $t->timestamp('geocoded_at')->nullable()->after('longitude');
            $t->string('geocoded_source', 20)->nullable()->after('geocoded_at');
            $t->index(['event_id', 'geocoded_at']); // batch queries "à géocoder"
        });
    }

    public function down(): void
    {
        Schema::table('membership_requests', function (Blueprint $t) {
            $t->dropIndex(['event_id', 'geocoded_at']);
            $t->dropColumn(['latitude', 'longitude', 'geocoded_at', 'geocoded_source']);
        });
    }
};
