<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Simulation Bal — crée un event "🧪 TEST · A Dark Night in Elegance"
 * jumeau de l'event principal, avec N tickets fictifs prêts à être scannés.
 *
 * Utilisation :
 *   php artisan nwc:simulate-test-bal
 *   php artisan nwc:simulate-test-bal --tickets=30
 *   php artisan nwc:simulate-test-bal --reset  (supprime tout + recrée)
 *
 * Après création :
 *  - L'event apparaît dans /admin/evenements avec badge "TEST"
 *  - N tickets confirmed prêts pour le scan (utilise n'importe quel short_code)
 *  - Testable : liste présence, dashboard 360, exports, notifs cap 80/95%
 *
 * Aucun vrai email n'est envoyé (les emails générés sont @test.nwc.local).
 */
class SimulateTestBal extends Command
{
    protected $signature = 'nwc:simulate-test-bal
                            {--tickets=30 : Nombre de tickets fictifs à générer}
                            {--source= : Slug de l\'event à cloner (défaut: premier event ticketed)}
                            {--reset : Supprime l\'event test existant + tickets avant de recréer}';

    protected $description = 'Simule un event Bal avec tickets fictifs pour tester la billetterie';

    /** Prénoms/noms/téléphones fictifs — mix ivoirien réaliste. */
    private array $firstNames = [
        'Marie', 'Aïcha', 'Fatou', 'Grace', 'Christelle', 'Ange', 'Pauline', 'Ornella',
        'Yannick', 'Jean-Marc', 'Amadou', 'Kouassi', 'Serge', 'Olivier', 'Franck', 'David',
        'Sarah', 'Ruth', 'Esther', 'Rachel', 'Anne', 'Lydie', 'Emmanuel', 'Josué',
        'Judith', 'Naomi', 'Deborah', 'Priscille', 'Simon', 'Timothée', 'Paul', 'Jonas',
    ];
    private array $lastNames = [
        'KOFFI', 'YAO', 'KOUAME', 'DIABATE', 'TOURE', 'DIALLO', 'BAKAYOKO', 'OUATTARA',
        'ZONGO', 'KONE', 'SORO', 'GNAMBA', 'ADOU', 'BROU', 'ASSI', 'ATTA',
        'NIANGORAN', 'ETTIEN', 'ZADI', 'DJEDJE', 'BOKA', 'ANGOMAN', 'AKA', 'KOUADIO',
    ];
    private array $ticketTypesSample = ['Standard', 'VIP', 'VIP', 'Standard', 'Standard', 'Étudiant'];

    public function handle(): int
    {
        $count = (int) $this->option('tickets');
        if ($count < 1 || $count > 300) {
            $this->error("--tickets doit être entre 1 et 300 (reçu: {$count})");
            return self::FAILURE;
        }

        // 1. Choix de l'event source à cloner
        $source = $this->findSourceEvent();
        if (! $source) {
            $this->error("Aucun event ticketed trouvé. Crée d'abord un event avec billetterie activée.");
            return self::FAILURE;
        }
        $this->info("→ Event source: {$source->title} (id={$source->id})");

        // 2. Reset si demandé
        $testSlug = 'test-' . Str::slug($source->slug);
        $existing = Event::where('slug', $testSlug)->first();
        if ($existing) {
            if ($this->option('reset')) {
                $this->warn("→ Suppression de l'event test existant (id={$existing->id})…");
                EventTicket::where('event_id', $existing->id)->delete();
                $existing->delete();
            } else {
                $this->warn("Event test déjà existant (id={$existing->id}). Utilise --reset pour recréer.");
                return self::SUCCESS;
            }
        }

        // 3. Clone de l'event avec préfixe TEST
        $this->info("→ Création de l'event test…");
        $testEvent = $source->replicate([
            'created_at', 'updated_at', 'tickets_sold',
            'alert_80_sent_at', 'alert_95_sent_at', 'reminders_j1_sent_at',
        ]);
        $testEvent->title       = '🧪 TEST · ' . $source->title;
        $testEvent->title_en    = $source->title_en ? '🧪 TEST · ' . $source->title_en : null;
        $testEvent->slug        = $testSlug;
        $testEvent->description = "⚠️ ÉVÉNEMENT DE TEST — pour simuler la billetterie.\n\n"
                                . $source->description;
        $testEvent->tickets_capacity = max(50, $count + 10);
        $testEvent->save();

        // Clone les types de tickets si présents
        if (method_exists($source, 'ticketTypes')) {
            foreach ($source->ticketTypes as $type) {
                $newType = $type->replicate(['created_at', 'updated_at', 'sold_count']);
                $newType->event_id = $testEvent->id;
                $newType->save();
            }
        }

        $this->info("  ✓ Event test créé: {$testEvent->title} (id={$testEvent->id})");
        $this->info("  ✓ Slug: {$testEvent->slug}");
        $this->info("  ✓ Capacity: {$testEvent->tickets_capacity}");

        // 4. Génération de N tickets fictifs
        $this->info("→ Génération de {$count} tickets fictifs…");
        $bar = $this->output->createProgressBar($count);
        $bar->start();

        $ticketTypeIds = $testEvent->ticketTypes()->pluck('id')->toArray();

        DB::transaction(function () use ($testEvent, $count, $bar, $ticketTypeIds) {
            for ($i = 1; $i <= $count; $i++) {
                $firstName = $this->firstNames[array_rand($this->firstNames)];
                $lastName  = $this->lastNames[array_rand($this->lastNames)];
                $shortCode = 'TEST' . strtoupper(Str::random(4));
                $orderCode = 'TEST-' . strtoupper(Str::random(8));

                $type = $this->ticketTypesSample[array_rand($this->ticketTypesSample)];
                $isVip = $type === 'VIP';

                EventTicket::create([
                    'event_id'       => $testEvent->id,
                    'ticket_type_id' => $ticketTypeIds ? $ticketTypeIds[array_rand($ticketTypeIds)] : null,
                    'order_code'     => $orderCode,
                    'ticket_number'  => (string) random_int(100000000000, 999999999999),
                    'short_code'     => $shortCode,
                    'qr_payload'     => base64_encode(json_encode([
                        'ticket_id' => 0,
                        'event_id'  => $testEvent->id,
                        'ts'        => time(),
                        'sig'       => Str::random(16),
                    ])),
                    'access_token'   => Str::random(32),
                    'first_name'     => $firstName,
                    'last_name'      => $lastName,
                    'email'          => strtolower("{$firstName}.{$lastName}.{$i}@test.nwc.local"),
                    'phone'          => '05' . random_int(10000000, 99999999),
                    'status'         => 'confirmed',
                    'payment_status' => $isVip ? 'paid' : 'free',
                    'price_fcfa'     => $isVip ? 15000 : 0,
                    'whatsapp_opt_in'=> false,
                ]);
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine(2);

        // 5. Récap
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('  ✅ SIMULATION PRÊTE');
        $this->info('═══════════════════════════════════════════════════════');
        $this->line("  Event test    : {$testEvent->title}");
        $this->line("  ID            : {$testEvent->id}");
        $this->line("  Slug          : {$testEvent->slug}");
        $this->line("  Tickets créés : {$count}");
        $this->newLine();
        $this->info('  📱 Pour tester le SCAN :');
        $this->line("     → Ouvre /scan?event={$testEvent->id}");
        $this->line("     → Scanne un des tickets par son short_code (ex: TESTXXXX)");
        $this->newLine();
        $this->info('  📊 Pour tester la LISTE DE PRÉSENCE :');
        $this->line("     → /admin/evenements/{$testEvent->id}/presence");
        $this->line("     → /admin/evenements/{$testEvent->id}/presence/kiosque");
        $this->newLine();
        $this->info('  🎫 Pour tester la BILLETTERIE :');
        $this->line("     → /admin/evenements/{$testEvent->id}/billetterie");
        $this->newLine();
        $this->info('  📈 Pour tester le DASHBOARD 360 :');
        $this->line('     → /admin/billetterie/vue-360 (les stats incluent maintenant l\'event test)');
        $this->newLine();

        // 6. Sample des short codes pour scan rapide
        $samples = EventTicket::where('event_id', $testEvent->id)
            ->inRandomOrder()
            ->limit(5)
            ->pluck('short_code');
        $this->info('  🎯 Short codes à essayer pour le scan :');
        foreach ($samples as $code) {
            $this->line("     • {$code}");
        }
        $this->newLine();

        $this->info('  🗑  Pour supprimer et recommencer :');
        $this->line('     php artisan nwc:simulate-test-bal --reset --tickets=' . $count);
        $this->newLine();

        return self::SUCCESS;
    }

    /** Trouve l'event source à cloner. */
    private function findSourceEvent(): ?Event
    {
        if ($slug = $this->option('source')) {
            return Event::where('slug', $slug)->first();
        }
        // Premier event ticketing_enabled non-test avec au moins 1 ticket vendu ou capacity > 0
        return Event::where('ticketing_enabled', true)
            ->where('slug', 'not like', 'test-%')
            ->where(function ($q) {
                $q->whereNotNull('tickets_capacity');
            })
            ->orderByDesc('id')
            ->first();
    }
}
