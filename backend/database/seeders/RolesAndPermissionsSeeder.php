<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeder — Rôles et permissions Spatie (refonte Étape 1).
 *
 * Crée les 6 rôles hiérarchiques de l'église :
 *  superadmin > pasteur > rh / admin > gouverneur > leader > membre
 *
 * Le rôle "capitaine" a été renommé en "gouverneur" pour aligner sur
 * la nouvelle nomenclature (cf. department_governors, governor_profiles).
 * Le rôle "leader" est ajouté distinctement pour les leaders de cellule.
 *
 * Convention de nommage : "verb noun" en minuscules avec espaces, pour
 * cohérence avec l'existant ("manage departments", "view cells", etc.).
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Vide le cache des permissions Spatie pour éviter les conflits.
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // === 1. Liste des permissions par module ===
        $permissions = [
            // Membres
            'view members', 'create members', 'edit members', 'delete members',
            'export members', 'assign roles',

            // Départements
            'view departments', 'manage departments', 'assign governors',

            // Cellules
            'view cells', 'manage cells',

            // Rapports département (Étape 1)
            'view department reports', 'submit department report',
            'review department report', 'manage department reports',
            'export department reports',

            // Rapports cellule (Étape 1)
            'view cell reports', 'submit cell reports', 'validate cell reports',
            'manage cell reports', 'export cell reports',

            // Présences cellule (Étape 1)
            'manage cell attendance', 'view cell analytics',

            // Profils gouverneur/leader (Étape 1)
            'manage governor profile', 'manage cell leader profile',

            // Médias département (Étape 1)
            'upload department media', 'manage department media',

            // Sermons
            'view sermons', 'create sermons', 'edit sermons',
            'delete sermons', 'publish sermons',
            // Séries & thèmes de sermons (archivage long terme)
            'manage sermon series', 'manage sermon themes',
            // Témoignages (CRUD + publication)
            'manage testimonials',

            // Événements
            'view events', 'create events', 'edit events',
            'delete events', 'publish events', 'manage event registrations',
            // Billetterie
            'manage event tickets', 'scan tickets', 'validate ticket payments',
            'refund tickets', 'view attendance',

            // Dons
            'view donations', 'confirm donations', 'export donations',

            // Blog
            'view posts', 'create posts', 'edit posts',
            'delete posts', 'publish posts',

            // Galerie générale
            'view gallery', 'upload media', 'delete media',

            // Live
            'manage live streams', 'start live', 'end live',

            // Prières
            'view prayer requests', 'manage prayer requests', 'publish prayers',

            // Newsletter
            'manage newsletter subscribers', 'send newsletter',

            // Contact
            'view contact messages', 'reply contact messages',

            // Paramètres système
            'manage settings', 'manage logos', 'manage social links',
            'manage donation accounts',

            // Admin / Audit
            'access admin panel', 'view activity log', 'view dashboard',
        ];

        // Création de toutes les permissions (idempotent).
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // === 2. Création des rôles ===

        // SUPERADMIN — accès intégral, configuration système, irrévocable.
        $superadmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $superadmin->syncPermissions(Permission::all());

        // PASTEUR — supervision spirituelle.
        // Vue d'ensemble + approbation des rapports. Pas d'admin système ni de
        // gestion technique (création/suppression de membres, rôles, settings…).
        // Whitelist explicite : on liste UNIQUEMENT ce que le pasteur peut faire,
        // pour éviter qu'une nouvelle permission ajoutée n'élève ses droits par défaut.
        $pasteur = Role::firstOrCreate(['name' => 'pasteur', 'guard_name' => 'web']);
        $pasteur->syncPermissions([
            'access admin panel', 'view dashboard',
            // Personnes : lecture + export (pas de création/suppression).
            'view members', 'export members',
            'view departments',
            // Cellules : voir + ajouter/éditer (supervision pastorale demandée).
            'view cells', 'manage cells', 'manage cell reports', 'validate cell reports',
            // Rapports département : voir + approuver / rejeter / gérer (cœur du rôle).
            'view department reports', 'review department report', 'manage department reports',
            'export department reports',
            'view cell reports', 'export cell reports', 'view cell analytics',
            // Contenu spirituel : lecture (pas d'édition).
            'view sermons', 'view events', 'view posts', 'view gallery',
            'view donations', 'export donations',
            'view prayer requests',
            'view activity log',
            // Phase 6 — Pasteur peut rembourser (supervision financière).
            'refund tickets',
            // Liste de présence (accès accueil temps réel + exports).
            'view attendance',
        ]);

        // RH ADMIN — pilote les personnes : membres, gouverneurs, rapports liés
        // aux membres. Pas d'admin système (settings, médias, contenu spirituel).
        $rh = Role::firstOrCreate(['name' => 'rh', 'guard_name' => 'web']);
        $rh->syncPermissions([
            'access admin panel', 'view dashboard',
            // Gestion complète des membres.
            'view members', 'create members', 'edit members', 'export members',
            // Attribution des rôles + assignation gouverneurs.
            'assign roles', 'assign governors',
            // Départements : voir + gérer (création/édition).
            'view departments', 'manage departments',
            // Cellules : voir + gérer.
            'view cells', 'manage cells', 'manage cell reports', 'validate cell reports',
            // Rapports : voir + review + manage (ce sont des données membres/dépts).
            'view department reports', 'review department report', 'manage department reports',
            'export department reports',
            'view cell reports', 'export cell reports', 'view cell analytics',
            'view activity log',
        ]);

        // ADMIN — gestion contenu et membres au quotidien.
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions([
            'access admin panel', 'view dashboard',
            'view members', 'create members', 'edit members', 'export members',
            'view departments', 'manage departments',
            'view cells', 'manage cells', 'validate cell reports',
            'view department reports', 'review department report',
            'manage department reports',
            'view cell reports', 'manage cell reports',
            'view cell analytics',
            // PAS de manage department media / upload media : RÉSERVÉ au superadmin
            // pour contrôler les bannières et la galerie publique.
            'view sermons', 'create sermons', 'edit sermons', 'publish sermons',
            'manage sermon series', 'manage sermon themes',
            'manage testimonials',
            'view events', 'create events', 'edit events',
            'publish events', 'manage event registrations',
            'manage event tickets', 'scan tickets', 'view attendance',
            'view donations', 'confirm donations', 'export donations',
            'view posts', 'create posts', 'edit posts', 'publish posts',
            'view gallery', // peut consulter mais pas uploader
            'manage live streams', 'start live', 'end live',
            'view prayer requests', 'manage prayer requests', 'publish prayers',
            'manage newsletter subscribers', 'send newsletter',
            'view contact messages', 'reply contact messages',
            'view activity log',
        ]);

        // ADMIN-SITE — maintenance contenu du site public (aide-superadmin).
        // Pasteur + édition contenu : sermons, events, posts, médias, dons (config),
        // newsletter, prayers, live, auth-images. PAS de gestion membres / rôles
        // / settings critiques. Cible : un assistant qui décharge le superadmin
        // sur les mises à jour quotidiennes du site (annonces, articles, etc.).
        $adminSite = Role::firstOrCreate(['name' => 'admin-site', 'guard_name' => 'web']);
        $adminSite->syncPermissions([
            'access admin panel', 'view dashboard', 'view activity log',
            // Personnes : lecture uniquement (peut pas modifier).
            'view members', 'view departments', 'view cells',
            // Rapports : lecture (pas de validation — c'est au pasteur/RH).
            'view department reports', 'view cell reports',
            // Contenu spirituel : CRUD complet (cœur du rôle).
            'view sermons', 'create sermons', 'edit sermons', 'delete sermons', 'publish sermons',
            'manage sermon series', 'manage sermon themes',
            'manage testimonials',
            'view events', 'create events', 'edit events', 'delete events',
            'publish events', 'manage event registrations',
            'manage event tickets', 'scan tickets', 'validate ticket payments',
            'refund tickets', 'view attendance',
            'view posts', 'create posts', 'edit posts', 'delete posts', 'publish posts',
            // Médias & galerie : peut uploader et organiser.
            'view gallery', 'upload media', 'delete media',
            // Live streams : peut planifier/démarrer/arrêter.
            'manage live streams', 'start live', 'end live',
            // Prières publiques : modération + publication.
            'view prayer requests', 'manage prayer requests', 'publish prayers',
            // Newsletter : envoi (utile pour annonces).
            'manage newsletter subscribers', 'send newsletter',
            // Contact : peut répondre aux messages publics.
            'view contact messages', 'reply contact messages',
            // Dons : lecture (pas de confirmation manuelle — c'est RH/admin).
            'view donations',
            // Paramètres site visuels : peut gérer les logos et liens sociaux,
            // PAS les comptes de paiement (sensible).
            'manage logos', 'manage social links',
        ]);

        // GOUVERNEUR — son espace dédié /gouverneur/* (PAS d'accès au panel admin).
        // Le scoping départemental se fait via GovernorMiddleware sur /api/governor/*.
        // Sécurité : PAS de gestion médias/bannières (réservé au superadmin
        // pour éviter du contenu inapproprié sur le site public).
        $gouverneur = Role::firstOrCreate(['name' => 'gouverneur', 'guard_name' => 'web']);
        $gouverneur->syncPermissions([
            'view dashboard',
            'view members',
            'view departments',
            'view cells',
            'submit department report',
            'view department reports',
            'manage department reports',
            'view cell reports',
            'view cell analytics',
            'manage governor profile',
            'manage cell leader profile',
            'view sermons',
            'view events',
            'view prayer requests',
        ]);

        // LEADER — son espace dédié /leader/* (PAS d'accès au panel admin).
        // Le scoping cellule se fait via CellLeaderMiddleware sur /api/leader/*.
        // NB: un gouverneur peut aussi être leader (cumul des deux rôles autorisé).
        $leader = Role::firstOrCreate(['name' => 'leader', 'guard_name' => 'web']);
        $leader->syncPermissions([
            'view dashboard',
            'view cells',
            'submit cell reports',
            'manage cell attendance',
            'view cell analytics',
            'manage cell leader profile',
            'view members',
            'view sermons',
            'view events',
            'view prayer requests',
        ]);

        // MEMBRE — espace personnel uniquement (pas d'admin).
        $membre = Role::firstOrCreate(['name' => 'membre', 'guard_name' => 'web']);
        // Aucune permission admin (consultation publique seulement).

        // CONTROLEUR — agent de sécurité qui scanne les tickets à l'entrée.
        // Accès uniquement à la page /scan. Pas d'accès admin panel.
        $controleur = Role::firstOrCreate(['name' => 'controleur', 'guard_name' => 'web']);
        $controleur->syncPermissions(['scan tickets']);

        // TRÉSORIER — Phase 6 — supervision financière billetterie.
        // Valide les paiements ET rembourse, lecture des dons et événements.
        // Pas d'autres accès admin pour rester focalisé sur les flux financiers.
        $tresorier = Role::firstOrCreate(['name' => 'tresorier', 'guard_name' => 'web']);
        $tresorier->syncPermissions([
            'access admin panel', 'view dashboard',
            'view events',
            'manage event tickets', 'validate ticket payments', 'refund tickets',
            'view attendance',
            'view donations', 'export donations',
        ]);

        // === 3. Compatibilité legacy : alias capitaine = gouverneur ===
        // Garde un rôle "capitaine" temporaire mappé sur les permissions gouverneur
        // pour ne pas casser les seeders/tests existants qui s'appuient dessus.
        // À retirer dans une future migration de nettoyage (Étape 5+).
        $capitaine = Role::firstOrCreate(['name' => 'capitaine', 'guard_name' => 'web']);
        $capitaine->syncPermissions($gouverneur->permissions);

        $this->command->info('  ✓ 10 rôles créés (superadmin, pasteur, rh, admin, admin-site, gouverneur, leader, membre, controleur, tresorier)');
        $this->command->info('  ✓ '.count($permissions).' permissions créées');
    }
}
