<?php

/**
 * Configuration WhatsApp — Phase 3 NWC billetterie.
 *
 * Driver actif via WHATSAPP_DRIVER (default: log en dev, meta en prod).
 * Meta Cloud API requiert : Business Account + WhatsApp Business + numéro vérifié
 * + templates approuvés. Voir docs : developers.facebook.com/docs/whatsapp/cloud-api
 */
return [

    'driver' => env('WHATSAPP_DRIVER', 'log'), // 'log' | 'meta'

    'enabled' => env('WHATSAPP_ENABLED', false), // killswitch global (admin peut désactiver)

    /*
    |--------------------------------------------------------------------------
    | Meta Cloud API
    |--------------------------------------------------------------------------
    | phone_number_id : id Meta du numéro émetteur (≠ numéro lui-même)
    | access_token    : token permanent (System User)
    | business_account_id : id du WhatsApp Business Account (pour gérer les templates par API)
    | api_version : v18.0 stable au 2026
    */
    'meta' => [
        'api_version'         => env('WHATSAPP_META_API_VERSION', 'v18.0'),
        'phone_number_id'     => env('WHATSAPP_META_PHONE_NUMBER_ID'),
        'access_token'        => env('WHATSAPP_META_ACCESS_TOKEN'),
        'business_account_id' => env('WHATSAPP_META_BUSINESS_ACCOUNT_ID'),
        'default_lang'        => env('WHATSAPP_META_DEFAULT_LANG', 'fr'),
        'timeout_seconds'     => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Templates Meta (préalablement approuvés côté Meta Business Manager)
    |--------------------------------------------------------------------------
    | Chaque clef interne → { name (côté Meta), lang, components_count }
    | Les params sont passés en BODY texte (les variables {{1}}, {{2}}…)
    |
    | ⚠ Les NAMES doivent EXACTEMENT correspondre à ceux validés dans Meta
    | Business Manager (statut "APPROVED"). Voir admin settings pour les renseigner.
    */
    'templates' => [
        // Confirmation après inscription (gratuit OU payant pending).
        'inscription' => [
            'name' => env('WHATSAPP_TEMPLATE_INSCRIPTION', 'nwc_inscription_confirmation'),
            'lang' => env('WHATSAPP_TEMPLATE_INSCRIPTION_LANG', 'fr'),
        ],
        // Tickets prêts après validation paiement (Phase 2).
        'tickets_ready' => [
            'name' => env('WHATSAPP_TEMPLATE_TICKETS_READY', 'nwc_tickets_ready'),
            'lang' => env('WHATSAPP_TEMPLATE_TICKETS_READY_LANG', 'fr'),
        ],
        // Rappel J-1.
        'reminder' => [
            'name' => env('WHATSAPP_TEMPLATE_REMINDER', 'nwc_event_reminder'),
            'lang' => env('WHATSAPP_TEMPLATE_REMINDER_LANG', 'fr'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Phone normalization
    |--------------------------------------------------------------------------
    | Côte d'Ivoire = country code 225. On accepte avec/sans + et espaces.
    | normalize() strip tout + format E.164 (225XXXXXXXXXX).
    */
    'default_country_code' => env('WHATSAPP_DEFAULT_COUNTRY_CODE', '225'),

];
