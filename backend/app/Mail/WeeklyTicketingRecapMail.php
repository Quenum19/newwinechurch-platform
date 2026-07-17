<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Phase 4 — Mail récap hebdo billetterie (cron lundi 8h).
 *
 * Envoyé au pasteur + admins. Donne :
 *  - KPIs semaine (inscrits, revenus, conversion)
 *  - Top events de la semaine
 *  - Alerts : events bientôt complets, pendants à valider
 */
class WeeklyTicketingRecapMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $data,
    ) {}

    public function envelope(): Envelope
    {
        $week = $this->data['week_label'] ?? '';
        return new Envelope(
            subject: '📊 Récap billetterie ' . $week . ' — New Wine Church',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tickets.weekly-recap',
            with: $this->data,
        );
    }
}
