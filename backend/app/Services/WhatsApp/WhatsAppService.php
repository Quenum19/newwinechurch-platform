<?php

namespace App\Services\WhatsApp;

use App\Models\EventTicket;
use App\Services\WhatsApp\Contracts\WhatsAppDriver;
use App\Services\WhatsApp\Drivers\LogDriver;
use App\Services\WhatsApp\Drivers\MetaCloudDriver;
use Illuminate\Support\Facades\Log;

/**
 * Service facade-like — point d'entrée unique pour envoyer des WhatsApp.
 *
 * Responsabilités :
 *  - Résolution du driver depuis la config
 *  - Normalisation du numéro destinataire (E.164 Côte d'Ivoire)
 *  - Vérif du killswitch global + opt-in par ticket
 *  - Persistence du tracking (whatsapp_sent_at, message_id, status, last_error)
 *
 * Les classes Notification (TicketIssuedWhatsApp, etc.) dépendent de ce service.
 */
class WhatsAppService
{
    private WhatsAppDriver $driver;

    public function __construct()
    {
        $this->driver = $this->resolveDriver();
    }

    /**
     * Envoie un template à un ticket donné — gère opt-in, killswitch, tracking.
     *
     * @return array{ ok: bool, skipped?: bool, message_id?: string, error?: string }
     */
    public function sendToTicket(EventTicket $ticket, string $templateKey, array $params): array
    {
        if (! config('whatsapp.enabled')) {
            return ['ok' => false, 'skipped' => true, 'error' => 'WhatsApp désactivé globalement.'];
        }
        if (! $ticket->whatsapp_opt_in) {
            return ['ok' => false, 'skipped' => true, 'error' => 'Opt-in décliné par l\'inscrit.'];
        }
        $to = $this->normalizePhone($ticket->phone);
        if (! $to) {
            return ['ok' => false, 'skipped' => true, 'error' => 'Numéro invalide ou vide.'];
        }

        $tplConfig = config("whatsapp.templates.$templateKey");
        if (! $tplConfig) {
            return ['ok' => false, 'error' => "Template $templateKey non configuré."];
        }

        $result = $this->driver->sendTemplate($to, $tplConfig['name'], $params, $tplConfig['lang']);

        // Tracking dans event_tickets
        $ticket->update([
            'whatsapp_sent_at'     => now(),
            'whatsapp_message_id'  => $result['message_id'] ?? null,
            'whatsapp_last_status' => $result['status'] ?? ($result['ok'] ? 'sent' : 'failed'),
            'whatsapp_last_error'  => $result['ok'] ? null : ($result['error'] ?? 'erreur inconnue'),
        ]);

        Log::info('WhatsApp dispatch', [
            'driver'    => $this->driver->name(),
            'ticket_id' => $ticket->id,
            'template'  => $templateKey,
            'ok'        => $result['ok'],
        ]);

        return $result;
    }

    /**
     * Normalisation numéro → format E.164 sans + (ex: "2250712345678").
     *
     * Strip espaces/tirets/parenthèses ; ajoute 225 si pas de country code ;
     * retourne null si le résultat n'a pas 10-15 chiffres.
     */
    public function normalizePhone(?string $raw): ?string
    {
        if (! $raw) return null;
        $digits = preg_replace('/\D+/', '', $raw);
        if (! $digits) return null;

        $cc = config('whatsapp.default_country_code', '225');
        // Si pas déjà préfixé par un country code (Côte d'Ivoire mobile = 10 digits)
        if (strlen($digits) === 10 && ! str_starts_with($digits, $cc)) {
            $digits = $cc . $digits;
        }
        // Strip le 0 initial si présent après le CC (cas "+225 0712..." → "22507...")
        if (str_starts_with($digits, $cc . '0')) {
            $digits = $cc . substr($digits, strlen($cc) + 1);
        }
        if (strlen($digits) < 10 || strlen($digits) > 15) return null;
        return $digits;
    }

    private function resolveDriver(): WhatsAppDriver
    {
        return match (config('whatsapp.driver')) {
            'meta'  => new MetaCloudDriver(config('whatsapp.meta', [])),
            default => new LogDriver(),
        };
    }

    public function driverName(): string
    {
        return $this->driver->name();
    }
}
