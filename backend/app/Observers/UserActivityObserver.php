<?php

namespace App\Observers;

use App\Models\User;
use App\Services\NotifyAdmins;

/**
 * Notifie RH + pasteur quand un nouveau membre est créé (via admission
 * ou via l'admin).
 *
 * Skip les users système :
 *  - guest_scanner (créés à la volée pour le magic-link)
 *  - users sans email valide
 */
class UserActivityObserver
{
    public function created(User $user): void
    {
        if ($user->status === 'guest_scanner' || $user->hasRole('guest-scanner')) return;
        if (! $user->email) return;

        $name = trim(($user->first_name ?? '').' '.($user->name ?? ''));
        NotifyAdmins::hr([
            'type'    => 'new_member',
            'title'   => 'Nouveau membre inscrit',
            'body'    => "{$name} vient de rejoindre NWC.",
            'user_id' => $user->id,
            'url'     => '/admin/membres/' . $user->id,
        ]);
    }
}
