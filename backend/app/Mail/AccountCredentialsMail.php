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
 * Mail envoyé au candidat dont la demande d'adhésion vient d'être approuvée.
 * Contient ses credentials initiaux (email + mot de passe par défaut).
 * Le user devra changer son mot de passe à la 1re connexion.
 */
class AccountCredentialsMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $initialPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Bienvenue à NWC — Tes accès');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.onboarding.account_credentials',
            with: [
                'user'            => $this->user,
                'initialPassword' => $this->initialPassword,
                // Le lien pointe vers le FRONTEND (newinechurch.org), pas l'API
                // (api.newinechurch.org qui n'a pas de route /connexion).
                'loginUrl'        => rtrim(config('app.frontend_url') ?: config('app.url'), '/').'/connexion',
            ],
        );
    }
}
