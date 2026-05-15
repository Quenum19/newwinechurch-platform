<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder — Paramètres dynamiques du site.
 *
 * Ces valeurs alimentent le footer, les pages contact, dons, etc.
 * L'admin peut les modifier depuis le dashboard sans déploiement.
 */
class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $settings = [
            // === Identité de l'église ===
            ['key' => 'church.name', 'value' => 'New Wine Church', 'group' => 'identity'],
            ['key' => 'church.short_name', 'value' => 'NWC', 'group' => 'identity'],
            ['key' => 'church.slogan', 'value' => 'Sauvé pour Sauver', 'group' => 'identity'],
            ['key' => 'church.tagline', 'value' => 'Une armée de jeunes pour Christ', 'group' => 'identity'],
            ['key' => 'church.pastor', 'value' => 'Pasteur Georges Amoako-Prempeh', 'group' => 'identity'],
            ['key' => 'church.parent_church', 'value' => 'Église La Maison de la Destinée', 'group' => 'identity'],

            // === Coordonnées ===
            ['key' => 'contact.email', 'value' => 'contact@newinechurch.org', 'group' => 'contact'],
            ['key' => 'contact.phone', 'value' => '+225 07 00 00 00 00', 'group' => 'contact'],
            ['key' => 'contact.address', 'value' => 'Cocody-Bonoumin, près d\'Abidjan Mall', 'group' => 'contact'],
            ['key' => 'contact.city', 'value' => 'Abidjan, Côte d\'Ivoire', 'group' => 'contact'],
            ['key' => 'contact.service_time', 'value' => 'Dimanche 13h00 — 15h00', 'group' => 'contact'],

            // === Logos (chemins relatifs au disque public) ===
            ['key' => 'logo.nwc', 'value' => '/logos/logo_newwine.png', 'type' => 'image', 'group' => 'branding'],
            ['key' => 'logo.parent', 'value' => '/logos/logo_md.png', 'type' => 'image', 'group' => 'branding'],
            // Image de fond du hero accueil (photo HD paysage, optionnelle).
            // Vide par défaut → la home affiche le fond crème + sticker rotatif.
            // Renseignée → la home affiche la photo en background avec overlay dramatique.
            ['key' => 'branding.hero_image', 'value' => '', 'type' => 'image', 'group' => 'branding'],

            // === Réseaux sociaux ===
            ['key' => 'social.facebook', 'value' => '', 'group' => 'social'],
            ['key' => 'social.instagram', 'value' => '', 'group' => 'social'],
            ['key' => 'social.youtube', 'value' => '', 'group' => 'social'],
            ['key' => 'social.tiktok', 'value' => '', 'group' => 'social'],
            ['key' => 'social.whatsapp', 'value' => '', 'group' => 'social'],

            // === Comptes Mobile Money (à compléter par l'admin avec les vrais numéros) ===
            ['key' => 'donation.orange_money_number', 'value' => '', 'group' => 'donation'],
            ['key' => 'donation.orange_money_label', 'value' => 'Orange Money', 'group' => 'donation'],
            ['key' => 'donation.wave_number', 'value' => '', 'group' => 'donation'],
            ['key' => 'donation.wave_label', 'value' => 'Wave', 'group' => 'donation'],
            ['key' => 'donation.mtn_number', 'value' => '', 'group' => 'donation'],
            ['key' => 'donation.mtn_label', 'value' => 'MTN MoMo', 'group' => 'donation'],
            ['key' => 'donation.account_holder', 'value' => 'New Wine Church', 'group' => 'donation'],

            // === Paramètres de live streaming ===
            ['key' => 'live.youtube_channel', 'value' => '', 'group' => 'live'],
            ['key' => 'live.notification_lead_minutes', 'value' => '15', 'group' => 'live'],
        ];

        foreach ($settings as $setting) {
            DB::table('site_settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge(
                    ['type' => 'text', 'created_at' => $now, 'updated_at' => $now],
                    $setting,
                )
            );
        }

        $this->command->info('  ✓ '.count($settings).' paramètres site initialisés');
    }
}
