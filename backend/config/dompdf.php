<?php

/**
 * Config dompdf publiée minimale — override pour Hostinger.
 *
 * Le default de barryvdh/laravel-dompdf appelle public_path() qui throw
 * "Cannot resolve public path" sur les setups Hostinger avec structure custom.
 * On fixe le chroot vers storage/app/tmp qu'on sait writable.
 */
return [

    /*
     * Cache directory — writable + hors public
     */
    'font_cache' => storage_path('app/tmp/dompdf-fonts'),
    'temp_dir'   => storage_path('app/tmp'),

    /*
     * Chroot : dompdf ne lit que dans ces dossiers (sécurité anti-directory-traversal).
     * On l'oriente vers storage (où sont les QR PNG/SVG temp) + resources (pour les
     * views blade).
     */
    'chroot'     => [
        storage_path(),
        base_path('resources'),
        // Autorise dompdf à lire aussi les images publiques (cover events) sur Hostinger
        '/home/u781799599/domains/newinechurch.org/public_html',
    ],

    /*
     * Ne pas essayer de résoudre l'URL des ressources locales via public_path.
     * On passe les paths absolus dans le template Blade → pas besoin.
     */
    'enable_php'            => false,
    'enable_javascript'     => false,
    'enable_remote'         => false,
    'enable_html5_parser'   => true,
    'enable_font_subsetting'=> false,

    'default_font'          => 'DejaVu Sans',
    'default_paper_size'    => 'a4',
    'default_paper_orientation' => 'portrait',
    'default_media_type'    => 'screen',
];
