<?php

namespace App\Mail;

use App\Models\Donation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DonationConfirmedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Donation $donation) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reçu de don — '.number_format($this->donation->amount, 0, ',', ' ').' '.$this->donation->currency,
        );
    }

    public function content(): Content
    {
        $methodLabels = [
            'orange_money' => 'Orange Money',
            'wave'         => 'Wave',
            'mtn_momo'     => 'MTN MoMo',
            'card'         => 'Carte bancaire',
            'cash'         => 'Espèces',
            'other'        => 'Autre',
        ];

        return new Content(
            view: 'emails.donation_confirmed',
            with: [
                'donation'    => $this->donation,
                'donorName'   => $this->donation->user?->first_name
                              ?? $this->donation->donor_name
                              ?? 'Cher donateur',
                'methodLabel' => $methodLabels[$this->donation->method] ?? $this->donation->method,
            ],
        );
    }
}
