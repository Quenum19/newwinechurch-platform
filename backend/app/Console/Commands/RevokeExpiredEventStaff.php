<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\EventStaff;
use App\Models\GuestScannerToken;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Étape E — Auto-révocation post-event.
 *
 * Pour chaque événement dont `ends_at < now() - grants_ttl_after_event_hours`,
 * ce job :
 *   1. Révoque tous les grants event_staff encore actifs (revoked_at = now,
 *      revoke_reason = 'auto-post-event').
 *   2. Marque tous les guest_scanner_tokens active/suspended → revoked
 *      (les Sanctum tokens des guests ont déjà expiré via expires_at).
 *   3. Log un résumé chiffré (pour audit + observability).
 *
 * Idempotent : re-run n'affecte que les rows encore actifs → 0 grants → 0 op.
 *
 * TTL configurable via config/tickets.php :
 *   - grants_ttl_after_event_hours (défaut 24)
 *   - guest_scanner_token_ttl_after_event_hours (défaut 6, mais on force
 *     revoke à grants_ttl_after_event_hours pour éviter la double logique).
 */
class RevokeExpiredEventStaff extends Command
{
    protected $signature = 'nwc:revoke-expired-event-staff
                            {--dry-run : simule sans écrire}';

    protected $description = 'Révoque grants event_staff + tokens invités des events terminés depuis > TTL (défaut 24h).';

    public function handle(): int
    {
        $ttl    = (int) config('tickets.grants_ttl_after_event_hours', 24);
        $cutoff = Carbon::now()->subHours($ttl);
        $dryRun = (bool) $this->option('dry-run');

        // 1) Events terminés depuis > TTL. Fallback si ends_at est null :
        //    utilise starts_at + 6h comme fin implicite.
        $eventIds = Event::query()
            ->where(function ($q) use ($cutoff) {
                $q->where('ends_at', '<', $cutoff)
                  ->orWhere(function ($q2) use ($cutoff) {
                      $q2->whereNull('ends_at')
                         ->where('starts_at', '<', $cutoff->copy()->subHours(6));
                  });
            })
            ->pluck('id');

        if ($eventIds->isEmpty()) {
            $this->info('Aucun event expiré à traiter.');
            return self::SUCCESS;
        }

        $this->info("Events éligibles : {$eventIds->count()} (cutoff : {$cutoff}).");

        [$revokedStaff, $revokedGuests] = [0, 0];

        DB::transaction(function () use ($eventIds, $dryRun, &$revokedStaff, &$revokedGuests) {
            // 2) Grants event_staff encore actifs → revoked_at = now
            $staffQuery = EventStaff::whereIn('event_id', $eventIds)->whereNull('revoked_at');
            $revokedStaff = $staffQuery->count();
            if (! $dryRun && $revokedStaff > 0) {
                $staffQuery->update([
                    'revoked_at'    => now(),
                    'revoke_reason' => 'auto-post-event',
                    'updated_at'    => now(),
                ]);
            }

            // 3) Guest tokens active/suspended → revoked
            $guestQuery = GuestScannerToken::whereIn('event_id', $eventIds)
                ->whereIn('status', [
                    GuestScannerToken::STATUS_ACTIVE,
                    GuestScannerToken::STATUS_SUSPENDED,
                ]);
            $revokedGuests = $guestQuery->count();
            if (! $dryRun && $revokedGuests > 0) {
                $guestQuery->update([
                    'status'     => GuestScannerToken::STATUS_REVOKED,
                    'updated_at' => now(),
                ]);
            }
        });

        $prefix = $dryRun ? '[DRY-RUN] ' : '';
        $this->info("{$prefix}Grants event_staff révoqués : {$revokedStaff}");
        $this->info("{$prefix}Guest tokens révoqués       : {$revokedGuests}");

        Log::info('nwc:revoke-expired-event-staff', [
            'dry_run'         => $dryRun,
            'events_targeted' => $eventIds->count(),
            'staff_revoked'   => $revokedStaff,
            'guests_revoked'  => $revokedGuests,
            'cutoff'          => $cutoff->toIso8601String(),
        ]);

        return self::SUCCESS;
    }
}
