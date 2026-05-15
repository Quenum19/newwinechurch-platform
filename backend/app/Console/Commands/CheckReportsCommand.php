<?php

namespace App\Console\Commands;

use App\Jobs\CheckMissingCellReportsJob;
use App\Jobs\CheckOverdueReportsJob;
use Illuminate\Console\Command;

/**
 * Commande manuelle : `php artisan nwc:check-reports` lance les deux jobs
 * de vérification (overdue + missing cells) en synchrone pour usage admin.
 */
class CheckReportsCommand extends Command
{
    protected $signature   = 'nwc:check-reports {--missing-only : Lance uniquement le check des cellules manquantes}';
    protected $description = 'Vérifie les rapports département en retard ET les cellules sans rapport hebdo.';

    public function handle(): int
    {
        if (! $this->option('missing-only')) {
            $this->info('▶ CheckOverdueReportsJob...');
            (new CheckOverdueReportsJob())->handle();
            $this->info('  ✓ Terminé');
        }

        $this->info('▶ CheckMissingCellReportsJob...');
        (new CheckMissingCellReportsJob())->handle();
        $this->info('  ✓ Terminé');

        return self::SUCCESS;
    }
}
