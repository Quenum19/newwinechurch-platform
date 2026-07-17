<?php

/**
 * Config Billetterie & Staff événement — Étape A rôles/permissions.
 *
 * scanner_lead_department_slugs :
 *   Slugs des départements dont le respo hérite AUTOMATIQUEMENT du grant
 *   `scanner_lead` sur chaque nouvel événement (via EventObserver).
 *   Configurable pour s'adapter à un renommage de département.
 *
 * grants_ttl_after_event_hours :
 *   Délai (en heures) après ends_at (ou starts_at + 6h si ends_at null)
 *   avant révocation auto des grants event_staff.
 *
 * guest_scanner_token_ttl_after_event_hours :
 *   Délai (en heures) après ends_at avant expiration des magic links
 *   des scanners invités externes.
 */

return [
    'scanner_lead_department_slugs' => [
        'parking-et-securite',
    ],

    'grants_ttl_after_event_hours' => 24,

    'guest_scanner_token_ttl_after_event_hours' => 6,
];
