<?php

return [
    App\Providers\AppServiceProvider::class,
    // TelescopeServiceProvider est enregistré conditionnellement dans
    // AppServiceProvider::register() : Telescope étant une dépendance DEV
    // (`require-dev`), il n'est pas installé via `composer install --no-dev`
    // en production — référencer son SP ici planterait l'app en prod.
];
