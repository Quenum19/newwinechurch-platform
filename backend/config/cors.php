<?php

/**
 * ==============================================================
 *  Configuration CORS — autorise le frontend Vite à appeler l'API.
 *
 *  En dev, les ports 5173 (Vite) et 3000 (alt) sont autorisés.
 *  En prod, seul le domaine final newinechurch.org sera autorisé.
 * ==============================================================
 */

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'broadcasting/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        // Ajouter ici le domaine de production : https://newinechurch.org
    ]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // INDISPENSABLE pour Sanctum cookie auth.
    'supports_credentials' => true,
];
