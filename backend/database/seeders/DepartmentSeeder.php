<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder — Liste officielle des 50 départements NWC (39 pourvus + 11 à pourvoir).
 *
 * Source : fournie par l'utilisateur 2026-05-12.
 * L'assignation gouverneur + téléphone est faite par GovernorSeeder ensuite,
 * qui consomme self::ACTIVE_DEPTS pour récupérer le nom et le contact réels.
 */
class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $order = 1;

        // === 39 départements actifs ===
        foreach (self::ACTIVE_DEPTS as $d) {
            $slug = Str::slug($d['name']);
            $nameEn = self::EN_TRANSLATIONS[$d['name']] ?? null;
            DB::table('departments')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name'               => $d['name'],
                    'name_en'            => $nameEn,
                    'slug'               => $slug,
                    'description'        => "Département {$d['name']} de New Wine Church.",
                    'description_en'     => $nameEn ? "{$nameEn} department of New Wine Church." : null,
                    'vision'             => 'Servir l\'église et la communauté avec excellence.',
                    'icon'               => $d['icon'],
                    'color'              => $d['color'],
                    'color_theme'        => $d['color'],
                    'governor_id'        => null,
                    'status'             => 'active',
                    'is_active'          => true,
                    'display_order'      => $order,
                    'sort_order'         => $order,
                    'founded_at'         => now()->subYears(rand(1, 8))->toDateString(),
                    'member_count_cache' => 0,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]
            );
            $order++;
        }

        // === 11 départements à pourvoir ===
        foreach (self::PENDING_DEPTS as $name) {
            $slug = Str::slug($name);
            $nameEn = self::EN_TRANSLATIONS[$name] ?? null;
            DB::table('departments')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name'               => $name,
                    'name_en'            => $nameEn,
                    'slug'               => $slug,
                    'description'        => 'Département à pourvoir — en attente d\'un gouverneur.',
                    'description_en'     => 'Department to be staffed — pending a governor.',
                    'vision'             => null,
                    'icon'               => 'circle-dashed',
                    'color'              => '#525252',
                    'color_theme'        => '#525252',
                    'governor_id'        => null,
                    'status'             => 'pending',
                    'is_active'          => false,
                    'display_order'      => $order,
                    'sort_order'         => $order,
                    'founded_at'         => null,
                    'member_count_cache' => 0,
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ]
            );
            $order++;
        }

        $a = count(self::ACTIVE_DEPTS);
        $p = count(self::PENDING_DEPTS);
        $this->command->info("  ✓ {$a} départements actifs + {$p} à pourvoir = ".($a + $p));
    }

    /**
     * 39 départements actifs avec gouverneur réel + téléphone (quand fourni).
     * GovernorSeeder consomme cette liste pour créer les comptes utilisateurs.
     */
    public const ACTIVE_DEPTS = [
        ['name' => 'Parking et Sécurité',                       'governor' => 'DORCAS YAO',           'phone' => '0706752688', 'icon' => 'shield',         'color' => '#8B1A2F'],
        ['name' => 'Évangélisation',                            'governor' => 'ATTOUNBRE CAPISTRAN',  'phone' => '0707295068', 'icon' => 'megaphone',      'color' => '#C9A84C'],
        ['name' => 'Accueil, Réception et Aide à l\'intérieur', 'governor' => 'DANIELLE KONAN',       'phone' => '0706633431', 'icon' => 'hand-shake',     'color' => '#B22240'],
        ['name' => 'Média Photo',                               'governor' => 'KOUE YANNICK',         'phone' => '0712435610', 'icon' => 'camera',         'color' => '#7E662E'],
        ['name' => 'Média Vidéo',                               'governor' => 'LOUIS SERGE',          'phone' => '0708187440', 'icon' => 'video',          'color' => '#9D2A47'],
        ['name' => 'Académie de Fondation et Formation',        'governor' => 'ANNA VICTOIRE LORNG',  'phone' => '0758360142', 'icon' => 'book-open',      'color' => '#C9A84C'],
        ['name' => 'Restauration',                              'governor' => 'FLORA IPOTEY',         'phone' => '0779797727', 'icon' => 'utensils',       'color' => '#8B1A2F'],
        ['name' => 'Logistique',                                'governor' => 'GBAH CEDRIC',          'phone' => null,         'icon' => 'package',        'color' => '#530F1B'],
        ['name' => 'Réseaux Sociaux',                           'governor' => 'AHOULOU REBECCA',      'phone' => '0173537973', 'icon' => 'share',          'color' => '#C9A84C'],
        ['name' => 'Sport',                                     'governor' => 'EDSON AHOUANA',        'phone' => '0160580445', 'icon' => 'activity',       'color' => '#B22240'],
        ['name' => 'Finance',                                   'governor' => 'REGINA',               'phone' => '0779224639', 'icon' => 'banknote',       'color' => '#7E662E'],
        ['name' => 'Dancing Star',                              'governor' => 'SIO GRÂCE DIVINE',     'phone' => '0705634306', 'icon' => 'sparkles',       'color' => '#C9A84C'],
        ['name' => 'Gestion des Instruments',                   'governor' => 'THEOPHILE GAUTIER',    'phone' => '0749158623', 'icon' => 'music',          'color' => '#530F1B'],
        ['name' => 'Chant',                                     'governor' => 'CONSTANCE BLE',        'phone' => '0789792316', 'icon' => 'mic',            'color' => '#C9A84C'],
        ['name' => 'Annonce et Régie',                          'governor' => 'AMANI YAO FLORENT',    'phone' => '0748613629', 'icon' => 'megaphone',      'color' => '#B22240'],
        ['name' => 'Ingénieur du Son',                          'governor' => 'KEVIN',                'phone' => '0504739207', 'icon' => 'speaker',        'color' => '#C9A84C'],
        ['name' => 'DRH (Direction Ressources Humaines)',       'governor' => 'SIO JUSTE FLORA',      'phone' => '0779169878', 'icon' => 'users',          'color' => '#C9A84C'],
        ['name' => 'Transport',                                 'governor' => 'JONES AURIOL',         'phone' => '0757083272', 'icon' => 'car',            'color' => '#7E662E'],
        ['name' => 'Call Center',                               'governor' => 'AUDREY',               'phone' => '0767891814', 'icon' => 'phone',          'color' => '#B22240'],
        ['name' => 'Marketing',                                 'governor' => 'YAO SAMINY HANS ENOCK','phone' => '0706633431', 'icon' => 'speaker',        'color' => '#9D2A47'],
        ['name' => 'Informatique / Webmaster',                  'governor' => 'SIO ROMUALD QUENUM',   'phone' => '0173501445', 'icon' => 'wifi',           'color' => '#B22240'],
        ['name' => 'Hygiène',                                   'governor' => 'CHRISTIAN',            'phone' => '0161173501', 'icon' => 'sparkles',       'color' => '#C9A84C'],
        ['name' => 'Insertion Interne',                         'governor' => 'FAVOUR TANO',          'phone' => '0779179074', 'icon' => 'user-plus',      'color' => '#8B1A2F'],
        ['name' => 'Protocole',                                 'governor' => 'JEAN MARC',            'phone' => '0779392255', 'icon' => 'crown',          'color' => '#8B1A2F'],
        ['name' => 'Sentinelle',                                'governor' => 'GUEMI MAGLOIRE',       'phone' => '0757913675', 'icon' => 'shield',         'color' => '#530F1B'],
        ['name' => 'Planning et Gestion des Cultes',            'governor' => 'LORNG ANNA',           'phone' => '0758360142', 'icon' => 'calendar',       'color' => '#C9A84C'],
        ['name' => 'Traduction de Texte',                       'governor' => 'MURIELLE BAHI',        'phone' => '0554672158', 'icon' => 'languages',      'color' => '#7E662E'],
        ['name' => 'PowerPoint',                                'governor' => 'SIO ROMUALD QUENUM',   'phone' => '0173501445', 'icon' => 'monitor',        'color' => '#B22240'],
        ['name' => 'Visite des Membres',                        'governor' => 'DAME CODJIA',          'phone' => '0757807002', 'icon' => 'heart-handshake','color' => '#C9A84C'],
        ['name' => 'Social',                                    'governor' => 'MME CODJIA',           'phone' => '0757807002', 'icon' => 'heart',          'color' => '#8B1A2F'],
        ['name' => 'Production Gadgets à Vendre',               'governor' => 'MARIE',                'phone' => null,         'icon' => 'shopping-bag',   'color' => '#9D2A47'],
        ['name' => 'Rap et Musique Urbaine',                    'governor' => 'CLINTON',              'phone' => '0585428474', 'icon' => 'music',          'color' => '#9D2A47'],
        ['name' => 'Média Audio',                               'governor' => 'PAUL',                 'phone' => '0594461068', 'icon' => 'headphones',     'color' => '#7E662E'],
        ['name' => 'Gestion des Projets et Mise en Place',      'governor' => null,                   'phone' => null,         'icon' => 'clipboard-list', 'color' => '#530F1B'],
        ['name' => 'New Wine Mag',                              'governor' => 'DORCAS MOROKO',        'phone' => '0556510989', 'icon' => 'book',           'color' => '#C9A84C'],
        ['name' => 'Cinématographie',                           'governor' => 'GUENAM MAEVA',         'phone' => '0150192871', 'icon' => 'film',           'color' => '#530F1B'],
        ['name' => 'New Wine Vibecast',                         'governor' => 'AURIOL JONES',         'phone' => null,         'icon' => 'radio',          'color' => '#B22240'],
        ['name' => 'Attaché Pastoral',                          'governor' => 'OLIVIER MATTE',        'phone' => null,         'icon' => 'user-cog',       'color' => '#8B1A2F'],
        ['name' => 'Style et Mode',                             'governor' => 'AMI DE PAUL',          'phone' => null,         'icon' => 'shirt',          'color' => '#9D2A47'],
    ];

    /** 11 départements à pourvoir. */
    public const PENDING_DEPTS = [
        'Archives',
        'Insertion Professionnelle',
        'Effusion du Saint-Esprit',
        'Délivrance',
        'Statistiques',
        'Juridique',
        'Suivi et Exécution des Activités',
        'Infographie et Design',
        'Achat',
        'Événementiel',
        'Divertissement',
    ];

    /**
     * Traductions EN des 50 noms de département (39 actifs + 11 pending).
     * Si non présent, le frontend retombe sur le FR (fallback).
     */
    public const EN_TRANSLATIONS = [
        // Actifs
        'Parking et Sécurité'                       => 'Parking & Security',
        'Évangélisation'                            => 'Evangelism',
        'Accueil, Réception et Aide à l\'intérieur' => 'Welcome, Reception & Indoor Help',
        'Média Photo'                               => 'Photo Media',
        'Média Vidéo'                               => 'Video Media',
        'Académie de Fondation et Formation'        => 'Foundation & Training Academy',
        'Restauration'                              => 'Catering',
        'Logistique'                                => 'Logistics',
        'Réseaux Sociaux'                           => 'Social Media',
        'Sport'                                     => 'Sports',
        'Finance'                                   => 'Finance',
        'Dancing Star'                              => 'Dancing Star',
        'Gestion des Instruments'                   => 'Instruments Management',
        'Chant'                                     => 'Choir',
        'Annonce et Régie'                          => 'Announcements & Stage Direction',
        'Ingénieur du Son'                          => 'Sound Engineering',
        'DRH (Direction Ressources Humaines)'       => 'HR (Human Resources)',
        'Transport'                                 => 'Transport',
        'Call Center'                               => 'Call Center',
        'Marketing'                                 => 'Marketing',
        'Informatique / Webmaster'                  => 'IT / Webmaster',
        'Hygiène'                                   => 'Hygiene',
        'Insertion Interne'                         => 'Internal Onboarding',
        'Protocole'                                 => 'Protocol',
        'Sentinelle'                                => 'Sentinel',
        'Planning et Gestion des Cultes'            => 'Service Planning & Management',
        'Traduction de Texte'                       => 'Text Translation',
        'PowerPoint'                                => 'PowerPoint',
        'Visite des Membres'                        => 'Member Visits',
        'Social'                                    => 'Social',
        'Production Gadgets à Vendre'               => 'Merchandise Production',
        'Rap et Musique Urbaine'                    => 'Rap & Urban Music',
        'Média Audio'                               => 'Audio Media',
        'Gestion des Projets et Mise en Place'      => 'Project Management & Setup',
        'New Wine Mag'                              => 'New Wine Mag',
        'Cinématographie'                           => 'Cinematography',
        'New Wine Vibecast'                         => 'New Wine Vibecast',
        'Attaché Pastoral'                          => 'Pastoral Attaché',
        'Style et Mode'                             => 'Style & Fashion',

        // Pending
        'Archives'                                  => 'Archives',
        'Insertion Professionnelle'                 => 'Career Integration',
        'Effusion du Saint-Esprit'                  => 'Outpouring of the Holy Spirit',
        'Délivrance'                                => 'Deliverance',
        'Statistiques'                              => 'Statistics',
        'Juridique'                                 => 'Legal',
        'Suivi et Exécution des Activités'          => 'Activity Tracking & Execution',
        'Infographie et Design'                     => 'Infographics & Design',
        'Achat'                                     => 'Purchasing',
        'Événementiel'                              => 'Events',
        'Divertissement'                            => 'Entertainment',
    ];
}
