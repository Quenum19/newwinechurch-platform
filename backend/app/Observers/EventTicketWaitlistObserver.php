<?php

namespace App\Observers;

use App\Models\EventTicketWaitlist;
use App\Services\BilletterieNotifier;
use Illuminate\Support\Facades\Log;

/**
 * Sprint B — #4 Alerte waitlist.
 *
 * À chaque nouvelle entrée en waitlist, notifie les managers billetterie
 * (permission `manage event tickets`). Throttle géré par BilletterieNotifier
 * (30 min par event pour éviter le spam si burst d'inscriptions).
 */
class EventTicketWaitlistObserver
{
    public function created(EventTicketWaitlist $entry): void
    {
        try {
            $entry->loadMissing('event');
            app(BilletterieNotifier::class)->alerteWaitlist($entry);
        } catch (\Throwable $e) {
            Log::warning('EventTicketWaitlistObserver::created failed', [
                'entry' => $entry->id, 'err' => $e->getMessage(),
            ]);
        }
    }
}
