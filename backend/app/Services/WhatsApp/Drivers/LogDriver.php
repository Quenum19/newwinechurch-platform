<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\Contracts\WhatsAppDriver;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Driver de simulation — n'envoie aucun message réel.
 *
 * Écrit l'envoi dans storage/logs/laravel.log avec un faux message_id.
 * Sert en :
 *  - DEV local (pas de compte Meta)
 *  - tests CI
 *  - feature flag OFF
 *
 * Comportement : retourne TOUJOURS ok=true (sauf si numéro vide).
 */
class LogDriver implements WhatsAppDriver
{
    public function name(): string
    {
        return 'log';
    }

    public function sendTemplate(string $to, string $template, array $params, string $lang = 'fr'): array
    {
        if (! $to) {
            return ['ok' => false, 'error' => 'Numéro destinataire vide', 'status' => 'failed'];
        }

        $fakeId = 'wamid.LOG.' . strtoupper(Str::random(20));

        Log::info('📱 WhatsApp [LOG driver]', [
            'to'       => $to,
            'template' => $template,
            'lang'     => $lang,
            'params'   => $params,
            'fake_id'  => $fakeId,
        ]);

        return [
            'ok'         => true,
            'message_id' => $fakeId,
            'status'     => 'sent',
        ];
    }
}
