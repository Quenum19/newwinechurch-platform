<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email de bienvenue envoyé après inscription.
 * Implémente ShouldQueue → envoyé en arrière-plan, pas de blocage HTTP.
 */
class WelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenue à New Wine Church 🙌',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome',
            with: ['user' => $this->user],
        );
    }
}
