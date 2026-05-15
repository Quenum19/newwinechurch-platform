<?php

namespace App\Services;

/**
 * Génère un token RTC Agora.io server-side (algorithme HMAC-SHA256).
 *
 * Implémentation conforme à la spec Agora "AccessToken2" v007.
 * Évite la dépendance Composer "agora/dynamic-key" qui n'est pas
 * maintenue à jour pour PHP 8.3.
 *
 * Pour générer en prod :
 *   AGORA_APP_ID + AGORA_APP_CERTIFICATE doivent être renseignés en .env.
 *
 * Rôles :
 *   ROLE_PUBLISHER (1)  → admin qui diffuse le live
 *   ROLE_SUBSCRIBER (2) → membres qui regardent
 */
class AgoraTokenService
{
    public const ROLE_PUBLISHER  = 1;
    public const ROLE_SUBSCRIBER = 2;

    public function __construct(
        protected ?string $appId = null,
        protected ?string $appCertificate = null,
    ) {
        $this->appId          = $appId          ?? (string) config('services.agora.app_id', env('AGORA_APP_ID'));
        $this->appCertificate = $appCertificate ?? (string) config('services.agora.app_certificate', env('AGORA_APP_CERTIFICATE'));
    }

    public function isConfigured(): bool
    {
        return ! empty($this->appId) && ! empty($this->appCertificate);
    }

    /**
     * Génère un token RTC pour rejoindre un channel.
     *
     * @param string $channelName Nom du channel Agora (= live_streams.channel_name)
     * @param int    $uid Identifiant numérique unique de l'utilisateur (0 = anonyme)
     * @param int    $role ROLE_PUBLISHER | ROLE_SUBSCRIBER
     * @param int    $expirySeconds Durée de validité (défaut 1h)
     */
    public function buildToken(string $channelName, int $uid, int $role, int $expirySeconds = 3600): string
    {
        if (! $this->isConfigured()) {
            // Le frontend devra afficher un message d'erreur clair côté admin/utilisateur.
            throw new \RuntimeException('Agora non configuré (AGORA_APP_ID + AGORA_APP_CERTIFICATE manquants).');
        }

        $issueTs   = time();
        $expireTs  = $issueTs + $expirySeconds;
        $salt      = random_int(1, 99999999);

        // Privilèges encodés en bitmap (cf doc Agora).
        // joinChannel = 1, publishAudioStream = 2, publishVideoStream = 3, publishDataStream = 4.
        $privileges = [];
        $privileges[1] = $expireTs; // joinChannel pour tout le monde

        if ($role === self::ROLE_PUBLISHER) {
            $privileges[2] = $expireTs; // publishAudioStream
            $privileges[3] = $expireTs; // publishVideoStream
            $privileges[4] = $expireTs; // publishDataStream
        }

        // Sérialisation des privilèges au format Agora.
        $message = $this->packMessage($salt, $issueTs, $privileges, $channelName, $uid);

        // Signature HMAC-SHA256 avec l'app certificate.
        $signature = hash_hmac('sha256', $message, $this->appCertificate, true);

        // Format final v007 : version (3 chars) + appId (32) + base64(sig+message+crc).
        $crcChannel = $this->crc32Unsigned($channelName);
        $crcUid     = $this->crc32Unsigned((string) $uid);

        $content = pack('N', strlen($signature)).$signature
                 . pack('N', $crcChannel)
                 . pack('N', $crcUid)
                 . pack('N', strlen($message)).$message;

        return '007'.$this->appId.base64_encode($content);
    }

    /** Sérialisation du payload "message" (privilèges + metadata). */
    private function packMessage(int $salt, int $ts, array $privileges, string $channel, int $uid): string
    {
        $out = pack('N', $salt).pack('N', $ts);
        $out .= pack('n', count($privileges));
        foreach ($privileges as $key => $value) {
            $out .= pack('n', $key).pack('N', $value);
        }
        $out .= pack('n', strlen($channel)).$channel;
        $out .= pack('n', strlen((string) $uid)).(string) $uid;
        return $out;
    }

    /** CRC32 non signé (Agora attend un uint32). */
    private function crc32Unsigned(string $data): int
    {
        $crc = crc32($data);
        return $crc < 0 ? $crc + 0x100000000 : $crc;
    }
}
