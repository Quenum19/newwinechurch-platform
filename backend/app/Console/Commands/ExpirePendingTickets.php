<?php

namespace App\Console\Commands;

use App\Services\TicketPaymentService;
use Illuminate\Console\Command;

/**
 * Phase 2 — Cron : expire les commandes pending dépassant payment_expires_at.
 *
 * Schedulé toutes les heures dans routes/console.php.
 * Marque les tickets en 'expired' + 'cancelled' → libère les places pour
 * d'autres inscrits (et la waitlist si activée).
 */
class ExpirePendingTickets extends Command
{
    protected $signature = 'tickets:expire-pending';
    protected $description = 'Expire les paiements ticket pending dépassant leur deadline (24h par défaut).';

    public function handle(TicketPaymentService $payments): int
    {
        $count = $payments->expirePendingPayments();
        $this->info("✓ {$count} ticket(s) expirés.");
        return self::SUCCESS;
    }
}
