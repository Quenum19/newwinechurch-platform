<?php

namespace App\Observers;

use App\Models\Donation;
use App\Services\NotifyAdmins;

/**
 * Notifie les admins d'une nouvelle offrande / don.
 */
class DonationObserver
{
    public function created(Donation $don): void
    {
        // Formatage montant FCFA (ex: 25 000 FCFA)
        $amount = number_format($don->amount ?? 0, 0, ',', ' ');
        $donorName = $don->donor_name
            ?? ($don->user?->first_name . ' ' . $don->user?->name)
            ?? 'Donateur anonyme';

        NotifyAdmins::global([
            'type'        => 'new_donation',
            'title'       => 'Nouveau don enregistré',
            'body'        => trim($donorName) . " a fait un don de {$amount} FCFA.",
            'donation_id' => $don->id,
            'amount'      => $don->amount,
            'url'         => '/admin/dons/' . $don->id,
        ]);
    }
}
