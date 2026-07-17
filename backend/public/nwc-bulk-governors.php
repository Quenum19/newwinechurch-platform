<?php
/**
 * NWC — Bulk import gouverneurs depuis la liste fournie par le pasteur.
 *
 * Pour chaque ligne :
 *   1. Cherche le user par téléphone (plus unique) puis fallback par nom
 *   2. Crée le user s'il n'existe pas (email temporaire, password à changer)
 *   3. Trouve le département via LIKE tolérant (sans accents, sans casse)
 *   4. Attache comme membre du pivot (role=member d'abord, sera promu)
 *   5. Assigne comme gouverneur via la même logique que le controller
 *   6. Synchronise le cache member_count_cache
 *
 * Idempotent : peut être relancé sans dupliquer.
 *
 * URL : https://api.newinechurch.org/nwc-bulk-governors.php?key=nwc-deploy-2026
 * ⚠️ SUPPRIME APRÈS USAGE.
 */

const DEPLOY_TOKEN = 'nwc-deploy-2026';
@set_time_limit(180);
@ini_set('memory_limit', '256M');

if (! hash_equals(DEPLOY_TOKEN, $_GET['key'] ?? '')) {
    http_response_code(403); exit('Accès refusé.');
}

header('Content-Type: text/plain; charset=utf-8');

$backend = realpath(__DIR__ . '/../../../../nwc_backend');
require "$backend/vendor/autoload.php";
$app = require_once "$backend/bootstrap/app.php";
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// === LA LISTE — extraite du document du pasteur ===
$rows = [
    ['dept' => 'PARKING ET SECURITE',                                    'first' => 'DORCAS',   'last' => 'YAO',                    'phone' => '0706752688'],
    ['dept' => 'EVANGELISATION',                                          'first' => 'CAPISTRAN','last' => 'ATTOUNBRE',              'phone' => '0707295068'],
    ['dept' => 'ACCUEIL, RÉCEPTION DES NOUVEAUX',                         'first' => 'DANIELLE', 'last' => 'KONAN',                  'phone' => '0706633431'],
    ['dept' => 'MEDIA PHOTO',                                             'first' => 'NAOMIE',   'last' => '',                       'phone' => '0712435610'],
    ['dept' => 'MEDIA VIDEO',                                             'first' => 'LOUIS',    'last' => 'SERGE',                  'phone' => '0708187440'],
    ['dept' => 'ACADÉMIE DE FONDATION',                                   'first' => 'ANNA',     'last' => 'VICTOIRE LORNG',         'phone' => '0758360142'],
    ['dept' => 'RESTAURATION',                                            'first' => 'FLORA',    'last' => 'IPOTEY',                 'phone' => '0779797727'],
    ['dept' => 'LOGISTIQUE',                                              'first' => 'CEDRIC',   'last' => 'GBAH',                   'phone' => null],
    ['dept' => 'RÉSEAUX SOCIAUX',                                         'first' => 'REBECCA',  'last' => 'AHOULOU',                'phone' => '0173537973'],
    ['dept' => 'SPORT',                                                   'first' => 'EDSON',    'last' => 'AHOUANA',                'phone' => '0160580445'],
    ['dept' => 'FINANCE',                                                 'first' => 'REGINA',   'last' => '',                       'phone' => '0779224639'],
    ['dept' => 'DANCING STAR',                                            'first' => 'GRÂCE DIVINE','last' => 'SIO',                 'phone' => '0705634306'],
    ['dept' => 'CHANT',                                                   'first' => 'CONSTANCE','last' => 'BLE',                    'phone' => '0789792316'],
    ['dept' => 'ANNONCE ET REGIS',                                        'first' => 'FLORENT',  'last' => 'AMANI YAO',              'phone' => '0748613629'],
    ['dept' => 'INGENIEUR DE SON',                                        'first' => 'KEVIN',    'last' => '',                       'phone' => '0504739207'],
    ['dept' => 'DRH',                                                     'first' => 'JUSTE FLORA','last' => 'SIO',                  'phone' => '0779169878'],
    ['dept' => 'TRANSPORT',                                               'first' => 'AURIOL',   'last' => 'JONES',                  'phone' => '0757083272'],
    ['dept' => 'CALL CENTER',                                             'first' => 'AUDREY',   'last' => '',                       'phone' => '0767891814'],
    ['dept' => 'MARKETING',                                               'first' => 'HANS ENOCK','last' => 'YAO SAMINY',            'phone' => '0706633431'],
    ['dept' => 'INFORMATIQUE',                                            'first' => 'ROMUALD',  'last' => 'SIO QUENUM',             'phone' => '0173501445'],
    ['dept' => 'HYGIENE',                                                 'first' => 'CHRISTIAN','last' => '',                       'phone' => '0161173501'],
    ['dept' => 'INSERTION INTERNE',                                       'first' => 'FAVOUR',   'last' => 'TANO',                   'phone' => '0779179074'],
    ['dept' => 'PROTOCOLE',                                               'first' => 'JEAN MARC','last' => '',                       'phone' => '0779392255'],
    ['dept' => 'SENTINELLE',                                              'first' => 'MAGLOIRE', 'last' => 'GUEMI',                  'phone' => '0757913675'],
    ['dept' => 'PLANNING ET GESTION DES CULTES',                          'first' => 'ANNA',     'last' => 'VICTOIRE LORNG',         'phone' => '0758360142'],
    ['dept' => 'TRADUCTION TEXTE',                                        'first' => 'MURIELLE', 'last' => 'BAHI',                   'phone' => '0554672158'],
    ['dept' => 'POWERPOINT',                                              'first' => 'ROMUALD',  'last' => 'SIO QUENUM',             'phone' => '0173501445'],
    ['dept' => 'VISITE DES MEMBRES',                                      'first' => 'DAME',     'last' => 'CODJIA',                 'phone' => '0757807002'],
    ['dept' => 'SOCIAL',                                                  'first' => 'DAME',     'last' => 'CODJIA',                 'phone' => '0757807002'],
    ['dept' => 'PRODUCTION GADGETS A VENDRE',                             'first' => 'MARIE',    'last' => '',                       'phone' => null],
    ['dept' => 'RAP ET MUSIQUE URBAINE',                                  'first' => 'CLINTON',  'last' => '',                       'phone' => '0585428474'],
    ['dept' => 'MEDIA AUDIO',                                             'first' => 'FAVOUR',   'last' => 'TANOH',                  'phone' => null],
    ['dept' => 'DÉPARTEMENT NEW WINE MAG',                                'first' => 'DORCAS',   'last' => 'MOROKO',                 'phone' => '0556510989'],
    ['dept' => 'CINEMATROGRAPHIE',                                        'first' => 'MAEVA',    'last' => 'GUENAM',                 'phone' => '0150192871'],
    ['dept' => 'NEW WINE VIBECAST',                                       'first' => 'JONES',    'last' => 'AURIOL',                 'phone' => null],
    ['dept' => 'ATTACHÉ PASTORAL',                                        'first' => 'OLIVIER',  'last' => 'MATTE',                  'phone' => null],
];

echo "═══════════════════════════════════════════════════════════════\n";
echo "  Bulk import gouverneurs NWC (" . count($rows) . " entrées)\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$superadmin = \App\Models\User::role('superadmin')->first();
if (! $superadmin) { exit("❌ Pas de superadmin pour le log appointed_by.\n"); }

$stats = ['ok' => 0, 'user_created' => 0, 'dept_not_found' => 0, 'errors' => 0];

/** Normalisation pour matching tolérant. */
function normalize(?string $s): string {
    if (! $s) return '';
    $s = mb_strtolower(trim($s));
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    $s = preg_replace('/[^a-z0-9 ]+/', ' ', $s);
    $s = preg_replace('/\s+/', ' ', trim($s));
    return $s;
}

foreach ($rows as $i => $row) {
    $num = $i + 1;
    $fullName  = trim(($row['first'] ?? '') . ' ' . ($row['last'] ?? ''));
    $phoneNorm = $row['phone'] ? preg_replace('/\D+/', '', $row['phone']) : null;

    echo "─── #{$num}  $fullName  →  {$row['dept']}\n";

    // === 1. Cherche le user ===
    $user = null;
    if ($phoneNorm) {
        // Cherche par téléphone : on compare la version "digits-only" stockée
        $user = \App\Models\User::whereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') = ?", [$phoneNorm])->first();
    }
    if (! $user && ! empty($row['first'])) {
        $needle = normalize($row['first'] . ' ' . $row['last']);
        // Cherche dans combinaisons first_name / name avec normalisation
        $candidates = \App\Models\User::query()
            ->select('id', 'first_name', 'name', 'phone', 'email')
            ->limit(20)->get()
            ->filter(function ($u) use ($needle) {
                $combo = normalize(($u->first_name ?? '') . ' ' . ($u->name ?? ''));
                return $combo === $needle ||
                       str_contains($combo, $needle) ||
                       str_contains($needle, $combo);
            });
        if ($candidates->count() === 1) {
            $user = $candidates->first();
        } elseif ($candidates->count() > 1) {
            echo "  ⚠️  Plusieurs users matchent « $fullName » → skip par sécurité.\n";
            $stats['errors']++;
            continue;
        }
    }

    // === 2. Création si absent ===
    if (! $user) {
        // Email temporaire — l'admin pourra changer plus tard.
        $emailSlug = strtolower(preg_replace('/[^a-z0-9]+/', '.', iconv('UTF-8', 'ASCII//TRANSLIT', $fullName)));
        $emailSlug = trim($emailSlug, '.');
        $email     = $emailSlug . '@temp.newinechurch.org';
        // Conflit ? ajoute un suffixe numérique
        $base = $email; $n = 1;
        while (\App\Models\User::where('email', $email)->exists()) {
            $email = str_replace('@', '+' . (++$n) . '@', $base);
            if ($n > 99) break;
        }

        try {
            $user = \App\Models\User::create([
                'first_name'           => $row['first'] ?? '',
                'name'                 => $row['last'] ?? '',
                'email'                => $email,
                'phone'                => $row['phone'] ?? null,
                'password'             => \Illuminate\Support\Facades\Hash::make('ChangeMe@NWC2026!'),
                'must_change_password' => true,
                'status'               => 'active',
                'is_baptized'          => false,
                'joined_at'            => now()->toDateString(),
            ]);
            $user->assignRole('membre');
            echo "  ✅ User CRÉÉ : id={$user->id}, email=$email (password temp = ChangeMe@NWC2026!)\n";
            $stats['user_created']++;
        } catch (\Throwable $e) {
            echo "  ❌ Échec création user : " . $e->getMessage() . "\n";
            $stats['errors']++;
            continue;
        }
    } else {
        echo "  • User trouvé : id={$user->id}\n";
    }

    // === 3. Cherche le département (LIKE tolérant) ===
    $needle = normalize($row['dept']);
    $dept = \App\Models\Department::all()->first(function ($d) use ($needle) {
        $n = normalize($d->name);
        return $n === $needle || str_contains($n, $needle) || str_contains($needle, $n);
    });
    if (! $dept) {
        echo "  ❌ Département « {$row['dept']} » introuvable.\n";
        $stats['dept_not_found']++;
        continue;
    }
    echo "  • Département : #{$dept->id} {$dept->name}\n";

    // === 4 + 5. Attache + Assigne gouverneur (réplique controller logic) ===
    try {
        \Illuminate\Support\Facades\DB::transaction(function () use ($dept, $user, $superadmin) {
            $userId = $user->id;
            $deptId = $dept->id;

            // Closure des anciens mandats de CE user sur CE dept (au cas où relance)
            \Illuminate\Support\Facades\DB::table('department_governors')
                ->where('department_id', $deptId)
                ->where('user_id', $userId)
                ->whereNull('ended_at')
                ->update(['ended_at' => now()->toDateString(), 'updated_at' => now()]);

            // Si ancien gouverneur différent → le rétrograde en member
            if ($dept->governor_id && $dept->governor_id !== $userId) {
                $dept->members()->updateExistingPivot($dept->governor_id, ['role' => 'member']);
                \Illuminate\Support\Facades\DB::table('department_governors')
                    ->where('department_id', $deptId)
                    ->where('user_id', $dept->governor_id)
                    ->whereNull('ended_at')
                    ->update(['ended_at' => now()->toDateString(), 'updated_at' => now()]);
                // Désactive flag is_governor si plus aucun mandat ailleurs
                $stillActive = \Illuminate\Support\Facades\DB::table('department_governors')
                    ->where('user_id', $dept->governor_id)
                    ->whereNull('ended_at')->exists();
                if (! $stillActive) {
                    \App\Models\User::where('id', $dept->governor_id)->update(['is_governor' => false]);
                }
            }

            // Attache (ou update) le nouveau dans le pivot
            if ($dept->members()->where('users.id', $userId)->exists()) {
                $dept->members()->updateExistingPivot($userId, ['role' => 'governor']);
            } else {
                $dept->members()->attach($userId, [
                    'role'      => 'governor',
                    'joined_at' => now()->toDateString(),
                ]);
            }

            // Rôle Spatie + flags user
            if (! $user->hasRole('gouverneur')) {
                $user->assignRole('gouverneur');
            }
            $user->update([
                'is_governor'   => true,
                'department_id' => $deptId,
            ]);

            // Nouveau mandat actif
            \Illuminate\Support\Facades\DB::table('department_governors')->insert([
                'department_id' => $deptId,
                'user_id'       => $userId,
                'is_primary'    => true,
                'appointed_at'  => now()->toDateString(),
                'ended_at'      => null,
                'appointed_by'  => $superadmin->id,
                'notes'         => 'Bulk import depuis liste pasteur',
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            // Cache + status dept
            $dept->update([
                'governor_id'        => $userId,
                'status'             => 'active',
                'member_count_cache' => $dept->members()->count(),
            ]);
        });
        echo "  ✅ Gouverneur assigné.\n";
        $stats['ok']++;
    } catch (\Throwable $e) {
        echo "  ❌ Erreur assignation : " . $e->getMessage() . "\n";
        $stats['errors']++;
    }

    echo "\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  RÉCAPITULATIF\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "  ✅ Gouverneurs assignés : {$stats['ok']}\n";
echo "  🆕 Users créés          : {$stats['user_created']}\n";
echo "  ❌ Départements absents : {$stats['dept_not_found']}\n";
echo "  ⚠️  Autres erreurs      : {$stats['errors']}\n\n";
echo "  Pour les users créés (email temp) :\n";
echo "    - Password temporaire : ChangeMe@NWC2026!\n";
echo "    - Email format : prenom.nom@temp.newinechurch.org\n";
echo "    - L'admin peut éditer leur email réel via /admin/membres\n\n";
echo "  ⚠️ SUPPRIME nwc-bulk-governors.php APRÈS USAGE.\n";
echo "═══════════════════════════════════════════════════════════════\n";
