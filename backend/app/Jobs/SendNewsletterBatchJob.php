<?php

namespace App\Jobs;

use App\Models\NewsletterSubscriber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Envoi par batch d'une newsletter.
 *
 * Chaque job traite une "page" d'abonnés (1000 max) → on évite de monopoliser
 * un worker avec 100 000 envois en une fois et on peut paralléliser.
 *
 * Pour 1M d'abonnés : 1000 jobs de 1000 envois → exécutés sur N workers Redis
 * → ≈ 30 min total avec 5 workers (selon SMTP throughput).
 *
 * Le throttling fin (1 mail / sec / IP, etc.) est délégué au driver mail.
 */
class SendNewsletterBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300; // 5 min par batch

    public function __construct(
        public string $subject,
        public string $body,           // HTML déjà sanitisé
        public array  $subscriberIds,  // max 1000 ids
        public ?int   $senderUserId = null,
    ) {}

    public function backoff(): array
    {
        return [60, 180];
    }

    public function handle(): void
    {
        $subscribers = NewsletterSubscriber::query()
            ->whereIn('id', $this->subscriberIds)
            ->where('is_confirmed', true)
            ->whereNull('unsubscribed_at')
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($subscribers as $sub) {
            try {
                $unsubToken = hash('sha256', $sub->email.config('app.key'));
                $unsubUrl = config('app.url').'/api/newsletter/unsubscribe?email='
                    .urlencode($sub->email).'&token='.$unsubToken;

                $personalizedBody = str_replace(
                    ['{{name}}', '{{unsubscribe_url}}'],
                    [e($sub->name ?? 'cher membre'), $unsubUrl],
                    $this->body
                );

                Mail::html($personalizedBody, function ($m) use ($sub) {
                    $m->to($sub->email, $sub->name ?? null)
                      ->subject($this->subject)
                      ->from(config('mail.from.address'), config('mail.from.name'));
                });
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                Log::warning('Newsletter delivery failed', [
                    'subscriber_id' => $sub->id,
                    'email'         => $sub->email,
                    'error'         => $e->getMessage(),
                ]);
            }
        }

        Log::info('Newsletter batch sent', [
            'subject' => $this->subject,
            'sent'    => $sent,
            'failed'  => $failed,
            'total'   => count($this->subscriberIds),
        ]);
    }
}
