<?php

namespace App\Mail;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EventReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Event  $event,
        public string $userName,
        public int    $daysBefore = 1,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Rappel — '.$this->event->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.event_reminder',
            with: [
                'event'      => $this->event,
                'userName'   => $this->userName,
                'daysBefore' => $this->daysBefore,
            ],
        );
    }
}
