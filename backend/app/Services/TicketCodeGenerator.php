<?php

namespace App\Services;

use App\Models\EventTicket;
use Illuminate\Support\Str;

/**
 * Génère les différents codes utilisés pour identifier un ticket.
 *
 *  - order_code   : groupe des tickets d'une même commande (TBBLDXLJTEF, 11 chars)
 *  - ticket_number: numéro long unique de la ligne (748962213265674, 15 digits)
 *  - short_code   : code court humain (NWC-7H4K) pour saisie manuelle au scan
 *  - access_token : token aléatoire pour la page publique /mon-ticket/{token}
 */
class TicketCodeGenerator
{
    /**
     * Code de commande style Tikerama (11 lettres majuscules).
     * Sans I/O/0/1 pour éviter les confusions de lecture.
     */
    public function newOrderCode(): string
    {
        return $this->randomCode(11, 'BCDFGHJKLMNPQRSTVWXYZ');
    }

    /**
     * Numéro long unique de ticket (15 chiffres, unique en BD).
     * Boucle jusqu'à trouver un libre — collision quasi nulle.
     */
    public function newTicketNumber(): string
    {
        do {
            $n = $this->randomNumeric(15);
        } while (EventTicket::where('ticket_number', $n)->exists());
        return $n;
    }

    /**
     * Code court humain (NWC-7H4K, 4 chars utiles).
     * Préfixe NWC pour reconnaître la source d'un coup d'œil.
     */
    public function newShortCode(): string
    {
        do {
            $code = 'NWC-' . $this->randomCode(4, 'ABCDEFGHJKLMNPQRSTVWXYZ23456789');
        } while (EventTicket::where('short_code', $code)->exists());
        return $code;
    }

    /** Token URL-safe pour la page publique du ticket. */
    public function newAccessToken(): string
    {
        return Str::random(40);
    }

    private function randomCode(int $len, string $alphabet): string
    {
        $max = strlen($alphabet) - 1;
        $out = '';
        for ($i = 0; $i < $len; $i++) {
            $out .= $alphabet[random_int(0, $max)];
        }
        return $out;
    }

    private function randomNumeric(int $len): string
    {
        // Premier digit non zéro pour éviter qu'Excel mange le zéro initial à l'export.
        $out = (string) random_int(1, 9);
        for ($i = 1; $i < $len; $i++) {
            $out .= random_int(0, 9);
        }
        return $out;
    }
}
