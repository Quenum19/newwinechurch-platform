<?php

namespace App\Notifications\Billetterie;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sprint B — #2 Digest quotidien billetterie.
 *
 * Destinataires : perm `view billetterie dashboard` (superadmin, admin, pasteur, rh, tresorier).
 * Envoyée par la command SendDailyTicketingDigest — le payload est déjà calculé.
 */
class DigestQuotidienBilletterieNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param array $payload {
     *   date_label, tickets_count, revenue_by_method, refunds_count,
     *   top_event: {title, count} | null, alerts: [string]
     * }
     */
    public function __construct(public array $payload) {}

    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $frontend = rtrim(config('app.frontend_url') ?: config('app.url'), '/');

        return (new MailMessage())
            ->subject("📊 Digest billetterie — {$this->payload['date_label']}")
            ->view('emails.billetterie.digest_quotidien', [
                'recipient' => $notifiable,
                'data'      => $this->payload,
                'url'       => $frontend . '/admin/billetterie',
            ]);
    }

    public function toArray(User $notifiable): array
    {
        return [
            'type'          => 'billetterie_digest_quotidien',
            'title'         => "Digest billetterie — {$this->payload['date_label']}",
            'body'          => ($this->payload['tickets_count'] ?? 0) . " ticket(s) hier · " .
                               number_format((int) ($this->payload['revenue_total'] ?? 0), 0, ',', ' ') . " F CFA",
            'date_label'    => $this->payload['date_label'] ?? null,
            'tickets_count' => $this->payload['tickets_count'] ?? 0,
            'url'           => '/admin/billetterie',
        ];
    }
}
