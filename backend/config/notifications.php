<?php

/**
 * Config des notifications billetterie NWC — Sprint B.
 *
 * Toutes les fenêtres de throttle sont exprimées en MINUTES (sauf mention contraire).
 * Modifiables sans redéploiement via .env → NWC_NOTIF_* ENV keys.
 *
 * Chaque throttle utilise le cache Laravel (préfixe `nwc_notif_`) avec TTL
 * égal à la fenêtre. Le check est fait dans le trigger avant dispatch.
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Throttles — anti-spam
    |--------------------------------------------------------------------------
    */
    'throttle' => [
        // 1. Nouvelle inscription — 5 min entre 2 mails/notifs si burst
        //    (même event / même destinataire).
        'nouvelle_inscription_minutes' => (int) env('NWC_NOTIF_NEW_TICKET_THROTTLE', 5),

        // 4. Alerte waitlist — 30 min max 1 mail par event.
        'waitlist_minutes' => (int) env('NWC_NOTIF_WAITLIST_THROTTLE', 30),

        // 7. Anomalie sécurité — 1 h max 1 mail par IP.
        'securite_minutes' => (int) env('NWC_NOTIF_SECURITY_THROTTLE', 60),

        // 7. Scan invalides — seuil pour déclencher l'alerte.
        'securite_max_invalid_scans' => (int) env('NWC_NOTIF_SECURITY_MAX_SCANS', 5),
        'securite_window_seconds'    => (int) env('NWC_NOTIF_SECURITY_WINDOW', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | Paliers capacité — alertes 80% et 95%
    |--------------------------------------------------------------------------
    */
    'capacity_thresholds' => [80, 95],

    /*
    |--------------------------------------------------------------------------
    | Préférences user opt-outables
    |--------------------------------------------------------------------------
    | Clés utilisables dans user_notification_preferences.notification_key.
    | Les clés notées `critical: true` NE PEUVENT PAS être désactivées.
    */
    'preferences' => [
        'nouvelle_inscription' => [
            'label'    => 'Nouvelle inscription billetterie',
            'critical' => false,
        ],
        'digest_quotidien' => [
            'label'    => 'Digest quotidien billetterie',
            'critical' => false,
        ],
        'alerte_capacite' => [
            'label'    => 'Alerte de capacité (80% / 95%)',
            'critical' => false,
        ],
        'alerte_waitlist' => [
            'label'    => 'Alerte liste d\'attente',
            'critical' => false,
        ],
        'bienvenue' => [
            'label'    => 'Email de bienvenue',
            'critical' => false,
        ],
        'anomalie_securite' => [
            'label'    => 'Anomalie de sécurité (scans invalides)',
            'critical' => true, // pas opt-outable
        ],
    ],

];
