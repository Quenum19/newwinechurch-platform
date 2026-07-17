<?php

namespace App\Observers;

use App\Models\ContactMessage;
use App\Services\NotifyAdmins;

/**
 * Notifie les admins d'un nouveau message via le formulaire de contact.
 */
class ContactMessageObserver
{
    public function created(ContactMessage $msg): void
    {
        $author = $msg->name ?? $msg->email ?? 'Anonyme';
        NotifyAdmins::global([
            'type'       => 'new_contact_message',
            'title'      => 'Nouveau message de contact',
            'body'       => "{$author} : \"" . mb_strimwidth($msg->message ?? $msg->subject ?? '', 0, 80, '…') . "\"",
            'message_id' => $msg->id,
            'url'        => '/admin/messages/' . $msg->id,
        ]);
    }
}
