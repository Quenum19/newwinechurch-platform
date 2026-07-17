<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;

/**
 * Service de signature HMAC pour les payloads QR — anti-fraude.
 *
 * Format du payload (encodé base64url) :
 *   { "t": ticket_number, "e": event_id, "s": signature }
 *   où signature = HMAC-SHA256(ticket_number|event_id, app.key)
 *
 * Le scanner décode → vérifie la signature → confirme que le payload n'a pas
 * été forgé. Un attaquant ne peut pas générer un faux QR valide sans connaître
 * la clé secrète serveur.
 */
class QrPayloadService
{
    private string $secret;

    public function __construct()
    {
        // La clé d'app Laravel est utilisée comme secret HMAC (existe déjà,
        // jamais commitée, change si on rotate la clé Laravel).
        $key = Config::get('app.key');
        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, 7));
        }
        $this->secret = $key;
    }

    /** Signe et encode le payload QR pour un ticket donné. */
    public function sign(string $ticketNumber, int $eventId): string
    {
        $data = ['t' => $ticketNumber, 'e' => $eventId];
        $signature = hash_hmac('sha256', $data['t'].'|'.$data['e'], $this->secret);
        $data['s'] = $signature;

        return $this->base64urlEncode(json_encode($data));
    }

    /**
     * Vérifie un payload QR scanné.
     *
     * @return array|null  ['ticket_number' => ..., 'event_id' => ...] si valide, null sinon
     */
    public function verify(string $encoded): ?array
    {
        // Le scanner peut aussi nous envoyer juste un short_code ou ticket_number direct.
        // Dans ce cas, on retourne null ici → le controller fallback sur lookup direct.
        try {
            $json = $this->base64urlDecode($encoded);
            $data = json_decode($json, true);

            if (! is_array($data)
                || empty($data['t']) || empty($data['e']) || empty($data['s'])) {
                return null;
            }

            $expected = hash_hmac('sha256', $data['t'].'|'.$data['e'], $this->secret);
            if (! hash_equals($expected, $data['s'])) {
                return null; // signature invalide → faux QR
            }

            return [
                'ticket_number' => $data['t'],
                'event_id'      => (int) $data['e'],
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    private function base64urlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64urlDecode(string $data): string
    {
        $pad = strlen($data) % 4;
        if ($pad) $data .= str_repeat('=', 4 - $pad);
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
