<?php

namespace App\Observers;

use App\Models\MembershipRequest;
use App\Services\NotifyAdmins;

/**
 * Notifie RH quand une demande d'adhésion arrive (workflow admission).
 */
class MembershipRequestObserver
{
    public function created(MembershipRequest $req): void
    {
        $name = trim(($req->first_name ?? '').' '.($req->name ?? ''));
        NotifyAdmins::hr([
            'type'       => 'new_membership_request',
            'title'      => 'Nouvelle demande d\'adhésion',
            'body'       => "{$name} demande à rejoindre l'église.",
            'request_id' => $req->id,
            'url'        => '/admin/demandes-adhesion',
        ]);
    }
}
