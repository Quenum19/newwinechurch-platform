<?php

namespace App\Services\WhatsApp\Drivers;

use App\Services\WhatsApp\Contracts\WhatsAppDriver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Driver Meta Cloud API — appel HTTP direct vers graph.facebook.com.
 *
 * Pré-requis prod :
 *  - Compte Meta Business Manager
 *  - WhatsApp Business Account vérifié
 *  - Numéro émetteur enregistré (phone_number_id)
 *  - System User avec permanent token (whatsapp_business_messaging scope)
 *  - Templates pré-approuvés dans Business Manager
 *
 * Le format des payloads suit la spec Meta v18.0.
 *  https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
class MetaCloudDriver implements WhatsAppDriver
{
    private string $apiVersion;
    private ?string $phoneNumberId;
    private ?string $accessToken;
    private int $timeout;

    public function __construct(array $config = [])
    {
        $this->apiVersion    = $config['api_version']     ?? 'v18.0';
        $this->phoneNumberId = $config['phone_number_id'] ?? null;
        $this->accessToken   = $config['access_token']    ?? null;
        $this->timeout       = (int) ($config['timeout_seconds'] ?? 10);
    }

    public function name(): string
    {
        return 'meta';
    }

    public function sendTemplate(string $to, string $template, array $params, string $lang = 'fr'): array
    {
        if (! $this->phoneNumberId || ! $this->accessToken) {
            return ['ok' => false, 'error' => 'Meta WhatsApp non configuré (phone_number_id ou access_token manquant).'];
        }

        $url = "https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        // Construction des components : seuls les params positionnels (BODY) sont passés ici.
        // Si le template a aussi un HEADER avec variable ou des BUTTONS dynamiques, étendre.
        $components = [];
        if (! empty($params)) {
            $components[] = [
                'type'       => 'body',
                'parameters' => array_map(fn ($p) => ['type' => 'text', 'text' => (string) $p], $params),
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => $to,
            'type'              => 'template',
            'template'          => [
                'name'       => $template,
                'language'   => ['code' => $lang],
                'components' => $components,
            ],
        ];

        try {
            $resp = Http::withToken($this->accessToken)
                ->timeout($this->timeout)
                ->acceptJson()
                ->post($url, $payload);

            $json = $resp->json() ?? [];

            if ($resp->successful()) {
                $messageId = $json['messages'][0]['id'] ?? null;
                return [
                    'ok'         => true,
                    'message_id' => $messageId,
                    'status'     => 'sent',
                    'raw'        => $json,
                ];
            }

            // Meta renvoie une erreur structurée { error: { message, code, ... } }
            $errMsg = $json['error']['message'] ?? "HTTP {$resp->status()}";
            Log::warning('Meta WhatsApp sendTemplate failed', [
                'to' => $to, 'template' => $template, 'status' => $resp->status(),
                'error' => $errMsg, 'raw' => $json,
            ]);
            return ['ok' => false, 'error' => $errMsg, 'raw' => $json, 'status' => 'failed'];
        } catch (\Throwable $e) {
            Log::warning('Meta WhatsApp HTTP exception', ['to' => $to, 'err' => $e->getMessage()]);
            return ['ok' => false, 'error' => 'Erreur réseau : ' . $e->getMessage(), 'status' => 'failed'];
        }
    }
}
