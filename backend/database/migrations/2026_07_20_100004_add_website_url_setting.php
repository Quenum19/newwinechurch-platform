<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute la clé `social.website_url` dans site_settings si absente.
 * Utilisée par la page publique "follow-us" (BAL 2026).
 *
 * Les autres clés social.* (facebook, instagram, tiktok, youtube, whatsapp)
 * existent déjà via SettingsSeeder.
 */
return new class extends Migration {
    public function up(): void
    {
        $now = now();

        DB::table('site_settings')->updateOrInsert(
            ['key' => 'social.website_url'],
            [
                'value'      => '',
                'type'       => 'text',
                'group'      => 'social',
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    public function down(): void
    {
        DB::table('site_settings')->where('key', 'social.website_url')->delete();
    }
};
