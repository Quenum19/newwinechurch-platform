<?php

/**
 * Configuration des passerelles de paiement — Phase 7 NWC billetterie.
 *
 * Driver actif par défaut (utilisé si event payment_mode = 'cinetpay').
 *
 * En dev/local : driver=stub (simule sans appel HTTP) pour tester le flow webhook.
 * En prod : driver=cinetpay avec sandbox/prod selon CINETPAY_MODE.
 */
return [

    'default_driver' => env('PAYMENT_DRIVER', 'stub'), // 'stub' | 'cinetpay'

    /*
    |--------------------------------------------------------------------------
    | CinetPay
    |--------------------------------------------------------------------------
    | Doc : https://docs.cinetpay.com/api/v2/
    | Compte marchand : merchant.cinetpay.com
    |
    | sandbox : transactions fictives, comptes test fournis par CinetPay
    | prod    : transactions réelles, compte marchand validé requis
    */
    'cinetpay' => [
        'mode'       => env('CINETPAY_MODE', 'sandbox'), // 'sandbox' | 'prod'
        'api_key'    => env('CINETPAY_API_KEY'),
        'site_id'    => env('CINETPAY_SITE_ID'),
        // URLs : où CinetPay renvoie l'inscrit après paiement (return_url)
        // et où il notifie le backend pour confirmer (notify_url, le webhook).
        // return_url côté FRONT, notify_url côté BACK (api.newinechurch.org).
        'return_url' => env('CINETPAY_RETURN_URL', env('APP_FRONTEND_URL', env('APP_URL')) . '/ma-commande'),
        'notify_url' => env('CINETPAY_NOTIFY_URL', env('APP_URL') . '/api/payments/cinetpay/webhook'),
        // Langue de l'interface checkout
        'lang'       => env('CINETPAY_LANG', 'fr'),
        // Currency CFA d'Afrique de l'Ouest (XOF) pour Côte d'Ivoire
        'currency'   => env('CINETPAY_CURRENCY', 'XOF'),
        // Channels acceptés : ALL (MM + carte) ou MOBILE_MONEY (sans carte)
        'channels'   => env('CINETPAY_CHANNELS', 'ALL'),
        'timeout'    => 15,
    ],

];
