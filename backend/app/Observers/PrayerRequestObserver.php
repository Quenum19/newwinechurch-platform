<?php

namespace App\Observers;

use App\Models\PrayerRequest;
use App\Services\NotifyAdmins;

/**
 * Notifie le pasteur d'une nouvelle demande de prière.
 */
class PrayerRequestObserver
{
    public function created(PrayerRequest $pr): void
    {
        $author = $pr->name ?? $pr->user?->first_name ?? 'Anonyme';
        NotifyAdmins::pastor([
            'type'      => 'new_prayer_request',
            'title'     => 'Nouvelle demande de prière',
            'body'      => "{$author} demande la prière.",
            'prayer_id' => $pr->id,
            'url'       => '/admin/prieres/' . $pr->id,
        ]);
    }
}
