<?php

namespace App\Console\Commands;

use App\Models\BalCandidate;
use App\Models\Event;
use App\Models\EventTicket;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Duplique un événement en version TEST — clone vide (0 tickets vendus).
 *
 * Utilisation :
 *   php artisan nwc:simulate-test-bal
 *   php artisan nwc:simulate-test-bal --tickets=10  (optionnel : ajoute N faux tickets)
 *   php artisan nwc:simulate-test-bal --reset       (supprime + recrée)
 *
 * Après création :
 *  - Nouvel event "🧪 TEST · <titre>" dans /admin/evenements
 *  - Billetterie active mais VIDE : 0 tickets vendus
 *  - Ton équipe s'inscrit via /billetterie/<slug> comme des vrais utilisateurs
 *  - Tout le système fonctionne normalement (mail, QR, scan, présence, dashboard)
 *
 * L'option --tickets reste dispo pour pré-remplir des tickets fictifs
 * si tu veux tester des scénarios spécifiques (alerte 80% etc.).
 */
class SimulateTestBal extends Command
{
    protected $signature = 'nwc:simulate-test-bal
                            {--tickets=0 : Nombre de tickets fictifs à pré-générer (0 = vide)}
                            {--candidates=8 : Nombre de candidats Roi & Reine à créer (0 = aucun)}
                            {--accounts : Créer les comptes test (sim-accueil, sim-photo, sim-regie) avec les bons rôles}
                            {--source= : Slug de l\'event à cloner (défaut: premier event ticketed)}
                            {--reset : Supprime la simulation existante avant de recréer}
                            {--destroy : Supprime tout (event test + tickets + candidats + comptes) puis quitte}';

    protected $description = 'Simulation complète bal : clone event + tickets + candidats + comptes test (tout est destroyable)';

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

    /** Comptes de test créés par --accounts. */
    private array $testAccounts = [
        ['email' => 'sim-accueil@test.local',  'first_name' => 'Simu',  'name' => 'Accueil',       'role' => 'accueil'],
        ['email' => 'sim-photo@test.local',    'first_name' => 'Simu',  'name' => 'Photographe',   'role' => 'controleur'], // scan tickets + upload photos
        ['email' => 'sim-regie@test.local',    'first_name' => 'Simu',  'name' => 'Régie',         'role' => 'admin'],
    ];

    public function handle(): int
    {
        // Mode destroy : tout supprimer et sortir
        if ($this->option('destroy')) {
            return $this->destroyAll();
        }

        $count = (int) $this->option('tickets');
        if ($count < 0 || $count > 300) {
            $this->error("--tickets doit être entre 0 et 300 (reçu: {$count})");
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
                BalCandidate::where('event_id', $existing->id)->delete();
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
        // Garde la capacity source (vraies conditions de test).
        // Note : tickets_sold reste à 0, ce sont vos vraies inscriptions qui l'incrémentent.
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

        // 4. Génération OPTIONNELLE de tickets fictifs
        if ($count > 0) {
            $this->info("→ Génération de {$count} tickets fictifs (optionnel, pour tests spécifiques)…");
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
        }

        // 4bis. Candidats Roi & Reine
        $candidatesCount = (int) $this->option('candidates');
        if ($candidatesCount > 0) {
            $this->info("→ Création de {$candidatesCount} candidats (moitié roi, moitié reine)…");
            $this->createCandidates($testEvent->id, $candidatesCount);
            $this->info("  ✓ Candidats créés.");
        }

        // 4ter. Comptes test
        if ($this->option('accounts')) {
            $this->info("→ Création des comptes test…");
            $this->createTestAccounts();
            $this->info("  ✓ Comptes test créés (mot de passe : sim2026).");
        }

        // 5. Récap
        $this->newLine();
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('  ✅ ÉVÉNEMENT TEST PRÊT — VIDE (0 tickets)');
        $this->info('═══════════════════════════════════════════════════════');
        $this->line("  Event         : {$testEvent->title}");
        $this->line("  ID            : {$testEvent->id}");
        $this->line("  Slug          : {$testEvent->slug}");
        $this->line("  Capacity      : {$testEvent->tickets_capacity} places");
        $this->line("  Tickets vendus: " . ($count > 0 ? "{$count} (fictifs)" : '0 — prêt pour vraies inscriptions'));
        $this->newLine();

        $this->info('  🎫 INSCRIPTION DEPUIS TON ÉQUIPE :');
        $this->line("     → Chaque personne va sur : /billetterie/{$testEvent->slug}");
        $this->line("     → Remplit son nom/email/téléphone comme en vrai");
        $this->line("     → Reçoit son ticket avec QR par email (adresse @test.nwc.local ignorée par SMTP)");
        $this->line("     → Note : utilise ta VRAIE adresse email pour recevoir le ticket");
        $this->newLine();

        $this->info('  📱 SCAN À L\'ENTRÉE :');
        $this->line("     → /scan?event={$testEvent->id}");
        $this->line('     → Scanne le QR reçu par email OU tape le short_code');
        $this->newLine();

        $this->info('  📊 SUIVI TEMPS RÉEL :');
        $this->line("     → Liste présence   : /admin/evenements/{$testEvent->id}/presence");
        $this->line("     → Vue kiosque      : /admin/evenements/{$testEvent->id}/presence/kiosque");
        $this->line("     → Dashboard event  : /admin/evenements/{$testEvent->id}/billetterie");
        $this->line("     → Dashboard 360°   : /admin/billetterie/vue-360");
        $this->newLine();

        $this->info('  🔔 CE QUI SE DÉCLENCHE AUTO PENDANT LE TEST :');
        $this->line('     - Chaque inscription → mail avec ticket QR');
        $this->line('     - À 80% de la capacity → alerte email admins');
        $this->line('     - À 95% de la capacity → alerte email admins');
        $this->line('     - Waitlist si complet → alerte email admins');
        $this->newLine();

        // Samples des short codes uniquement si tickets créés
        if ($count > 0) {
            $samples = EventTicket::where('event_id', $testEvent->id)
                ->inRandomOrder()
                ->limit(5)
                ->pluck('short_code');
            $this->info('  🎯 Short codes à essayer pour scan rapide :');
            foreach ($samples as $code) {
                $this->line("     • {$code}");
            }
            $this->newLine();
        }

        // Récap candidats
        if ($candidatesCount > 0) {
            $this->info('  👑 VOTE ROI & REINE :');
            $this->line("     → QR vote : {$this->frontendUrl()}/bal/vote/{$testEvent->id}");
            $this->line("     → Régie : /admin/bal/{$testEvent->id}/regie → 'Ouvrir le vote'");
            $this->line("     → Après vote → 'Proclamer' pour afficher les résultats");
            $this->newLine();
        }

        // Récap comptes
        if ($this->option('accounts')) {
            $this->info('  👤 COMPTES DE TEST (mot de passe : sim2026) :');
            foreach ($this->testAccounts as $acc) {
                $this->line("     • {$acc['email']}  (rôle: {$acc['role']})");
            }
            $this->newLine();
        }

        // Récap enrôlements
        $this->info('  ❤ ENRÔLEMENTS "REJOINDRE LA NWC" :');
        $this->line("     → QR follow us : {$this->frontendUrl()}/nwc/follow?event={$testEvent->id}");
        $this->line("     → Vue admin : /admin/evenements/{$testEvent->id}/enrolements");
        $this->newLine();

        // Récap photos
        $this->info('  📸 PHOTOS AMBIANCE (cadre Dark Night) :');
        $this->line("     → Upload : /admin/bal/{$testEvent->id}/photos");
        $this->line("     → Régie → slide 'Photos ambiance'");
        $this->newLine();

        $this->info('  🗑  Pour tout supprimer proprement :');
        $this->line('     php artisan nwc:simulate-test-bal --destroy');
        $this->newLine();

        return self::SUCCESS;
    }

    /** Trouve l'event source à cloner. */
    private function findSourceEvent(): ?Event
    {
        if ($slug = $this->option('source')) {
            return Event::where('slug', $slug)->first();
        }
        return Event::where('ticketing_enabled', true)
            ->where('slug', 'not like', 'test-%')
            ->where(function ($q) {
                $q->whereNotNull('tickets_capacity');
            })
            ->orderByDesc('id')
            ->first();
    }

    /** Crée N candidats fictifs (moitié roi / moitié reine). */
    private function createCandidates(int $eventId, int $count): void
    {
        // Prénoms genrés — masculins et féminins d'Afrique de l'Ouest
        $males = ['Yannick', 'Serge', 'Franck', 'Amadou', 'Kouassi', 'Jean-Marc', 'David', 'Simon', 'Josué', 'Emmanuel'];
        $females = ['Grace', 'Christelle', 'Aïcha', 'Fatou', 'Ornella', 'Rachel', 'Ruth', 'Sarah', 'Anne', 'Judith'];

        $roiCount = intval(ceil($count / 2));
        $reineCount = $count - $roiCount;

        DB::transaction(function () use ($eventId, $males, $females, $roiCount, $reineCount) {
            for ($i = 0; $i < $roiCount; $i++) {
                BalCandidate::create([
                    'event_id'      => $eventId,
                    'role'          => 'roi',
                    'first_name'    => $males[$i % count($males)],
                    'last_name'     => $this->lastNames[array_rand($this->lastNames)],
                    'display_order' => $i,
                    'is_active'     => true,
                ]);
            }
            for ($i = 0; $i < $reineCount; $i++) {
                BalCandidate::create([
                    'event_id'      => $eventId,
                    'role'          => 'reine',
                    'first_name'    => $females[$i % count($females)],
                    'last_name'     => $this->lastNames[array_rand($this->lastNames)],
                    'display_order' => $i,
                    'is_active'     => true,
                ]);
            }
        });
    }

    /** Crée les comptes de test (idempotent, restore les soft-deleted). */
    private function createTestAccounts(): void
    {
        foreach ($this->testAccounts as $acc) {
            // Le model User utilise SoftDeletes — cherche même les trashed
            // pour éviter les duplicate key errors si le destroy précédent
            // n'a pas fait de forceDelete.
            $user = User::withTrashed()->where('email', $acc['email'])->first();
            if ($user && $user->trashed()) {
                $user->restore();
            }
            if (! $user) {
                $user = User::create([
                    'email'      => $acc['email'],
                    'first_name' => $acc['first_name'],
                    'name'       => $acc['name'],
                    'password'   => Hash::make('sim2026'),
                    'status'     => 'active',
                ]);
            } else {
                // Reset mot de passe + status au cas où ils auraient changé
                $user->forceFill([
                    'password' => Hash::make('sim2026'),
                    'status'   => 'active',
                ])->save();
            }
            if (! $user->hasRole($acc['role'])) {
                $user->assignRole($acc['role']);
            }
        }
    }

    /** Destruction complète : event test + tickets + candidats + comptes test. */
    private function destroyAll(): int
    {
        $this->warn('🧹 Suppression complète de la simulation…');

        // 1. Events test (slug commence par 'test-')
        $events = Event::where('slug', 'like', 'test-%')->get();
        foreach ($events as $event) {
            $this->line("  → Event: {$event->title} (id={$event->id})");
            EventTicket::where('event_id', $event->id)->delete();
            BalCandidate::where('event_id', $event->id)->delete();
            \App\Models\BalVote::where('event_id', $event->id)->delete();
            \App\Models\BalPhoto::where('event_id', $event->id)->delete();
            \App\Models\MembershipRequest::where('event_id', $event->id)->delete();
            $event->delete();
        }

        // 2. Comptes test — forceDelete pour vraiment libérer l'email unique
        foreach ($this->testAccounts as $acc) {
            $user = User::withTrashed()->where('email', $acc['email'])->first();
            if ($user) {
                $this->line("  → Compte: {$acc['email']}");
                $user->forceDelete();
            }
        }

        $this->newLine();
        $this->info('✅ Simulation supprimée. Base propre.');
        return self::SUCCESS;
    }

    private function frontendUrl(): string
    {
        return rtrim(config('app.frontend_url', 'https://newinechurch.org'), '/');
    }
}
