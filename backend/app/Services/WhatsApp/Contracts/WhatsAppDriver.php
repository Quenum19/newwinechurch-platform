<?php

namespace App\Services\WhatsApp\Contracts;

/**
 * Contrat commun à tous les drivers WhatsApp (Meta Cloud, Twilio, Log).
 *
 * Méthode unique : sendTemplate() — c'est l'unique mode d'envoi business-initiated
 * supporté par les API officielles (Meta/Twilio).
 *
 * Le retour est normalisé : un array structuré que le service consommateur peut
 * persister dans event_tickets.whatsapp_* sans connaître les détails du driver.
 */
interface WhatsAppDriver
{
    /**
     * Envoie un message template à un numéro normalisé.
     *
     * @param string $to        Numéro E.164 sans + (ex: "2250700000000")
     * @param string $template  Nom du template (côté Meta = doit être APPROVED)
     * @param array  $params    Paramètres positionnels du template (BODY {{1}}, {{2}}, …)
     * @param string $lang      Code langue (ex: "fr", "en_US")
     *
     * @return array{ ok: bool, message_id?: string, status?: string, error?: string, raw?: array }
     */
    public function sendTemplate(string $to, string $template, array $params, string $lang = 'fr'): array;

    /** Identifiant du driver pour les logs (ex: "meta", "log", "twilio"). */
    public function name(): string;
}
