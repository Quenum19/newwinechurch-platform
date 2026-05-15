<?php

namespace App\Console\Commands;

use App\Jobs\SendWeeklyDepartmentDigestJob;
use Illuminate\Console\Command;

/**
 * `php artisan nwc:send-digest [--week=YYYY-MM-DD]`
 *
 * Force l'envoi du digest hebdo (pasteur + gouverneurs). Si --week est passé,
 * le digest portera sur la semaine contenant cette date.
 */
class SendDigestCommand extends Command
{
    protected $signature   = 'nwc:send-digest {--week= : Date YYYY-MM-DD dans la semaine ciblée}';
    protected $description = 'Envoie le digest hebdomadaire (pasteur + gouverneurs).';

    public function handle(): int
    {
        $week = $this->option('week');
        $this->info("▶ SendWeeklyDepartmentDigestJob (semaine: ".($week ?: 'courante').")...");
        (new SendWeeklyDepartmentDigestJob($week))->handle();
        $this->info('  ✓ Digest envoyé.');

        return self::SUCCESS;
    }
}
