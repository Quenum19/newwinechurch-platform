# 🍷 New Wine Church (NWC) — Plateforme web

> Église de jeunes adultes à Cocody-Bonoumin, Abidjan · « Sauvé pour Sauver »

Plateforme full-stack production-ready : site public, espace membre, dashboard admin complet, live streaming Agora, dons Mobile Money, newsletter, multilingue FR/EN, PWA.

---

## 🏗️ Stack

| Couche | Technologies |
|---|---|
| **Backend** | Laravel 13 · PHP 8.3 · MySQL 9 (InnoDB) · Sanctum 4 · Spatie (Permission, MediaLibrary, ActivityLog, Sluggable, Backup) · Reverb 1.10 (WebSockets) · Maatwebsite/Excel · Intervention Image · Telescope (dev) |
| **Frontend** | React 19 · Vite 8 · TanStack Query 5 · Zustand · React Router 7 · Tailwind 3 + Radix UI · Framer Motion · Tiptap · Agora SDK · video.js · Recharts · i18next FR/EN · Laravel Echo (Reverb client) |
| **Live** | Agora.io (token RTC server-side, broadcast Reverb pour badge "EN DIRECT") |
| **PWA** | Manifest + Service Worker manuel (cache-first statics, network-first pages) |
| **Auth** | Sanctum dual mode : SPA cookie HTTP-only **OU** Bearer token (mobile/PWA) |

---

## 🚀 Démarrage local (Wamp Windows)

### Prérequis
- PHP 8.3 + Composer 2.x
- MySQL 8.0+ (Wamp ou XAMPP, **InnoDB par défaut**)
- Node 22 + npm 10

### Installation

```bash
# 1. Cloner
git clone <url> newwinechurch
cd newwinechurch

# 2. Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Configurer la base dans .env (DB_DATABASE, DB_USERNAME, DB_PASSWORD)
# Puis :
php artisan migrate --seed --force
php artisan storage:link

# 3. Frontend
cd ../frontend
npm install

# 4. Démarrer (3 terminaux)
# Terminal 1 — Backend API
cd backend && php artisan serve --port=8000

# Terminal 2 — Queue worker (envois email, traitement images)
cd backend && php artisan queue:work

# Terminal 3 — Reverb WebSocket (live streaming + notifications)
cd backend && php artisan reverb:start

# Terminal 4 — Frontend
cd frontend && npm run dev
```

URLs :
- Site public : http://localhost:5173
- Admin : http://localhost:5173/admin
- API : http://localhost:8000/api
- Telescope (dev) : http://localhost:8000/telescope

### Comptes de test (créés par seeders)

| Rôle | Email | Mot de passe |
|---|---|---|
| Superadmin | `admin@newinechurch.org` | `Admin@NWC2025!` |
| Pasteur | `pasteur@newinechurch.org` | `Pasteur@NWC2025!` |
| Membres × 50 | `*@nwc-test.org` | `Membre@NWC2025!` |

---

## 📁 Architecture

```
newwinechurch/
├── backend/                       # Laravel 13
│   ├── app/
│   │   ├── Events/                # LiveStreamStarted, LiveStreamEnded
│   │   ├── Exports/               # MembersExport, DonationsExport (Excel)
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/              # Register, Login, PasswordReset, EmailVerification
│   │   │   ├── Public/            # 11 controllers (sermons, events, posts, donations, sitemap, ...)
│   │   │   ├── Member/            # MeController, DonationController, EventRegistrationController
│   │   │   └── Admin/             # 13 controllers (Members, Departments, Cells, Donations, Sermons, Events, Posts, Media, Prayers, Newsletter, Settings, Live, ActivityLog, Dashboard)
│   │   ├── Http/Requests/         # FormRequests par rôle (Auth/Member/Admin)
│   │   ├── Http/Resources/        # API Resources (transformation JSON)
│   │   ├── Jobs/                  # ProcessAvatarJob, ProcessUploadedImageJob, SendNewsletterBatchJob
│   │   ├── Mail/                  # WelcomeMail, DonationConfirmedMail, EventReminderMail
│   │   ├── Models/                # 16 modèles Eloquent
│   │   ├── Policies/              # DepartmentPolicy, CellPolicy (scope capitaine)
│   │   ├── Services/              # AgoraTokenService (HMAC-SHA256), HtmlSanitizer (anti-XSS)
│   │   └── Traits/                # HandlesImageUpload
│   ├── database/migrations/       # 28 migrations avec index dès création
│   ├── database/seeders/          # 11 seeders (rôles, départements, membres, sermons, ...)
│   ├── lang/{fr,en}/              # Validation FR + EN complète
│   ├── resources/views/emails/    # Templates Blade brandés (layout NWC réutilisable)
│   └── routes/
│       ├── api.php                # ~110 endpoints REST
│       ├── web.php                # sitemap.xml + robots.txt
│       └── channels.php           # Channels WebSocket (live, user, admin.dashboard)
└── frontend/                      # React 19 + Vite 8
    ├── public/
    │   ├── logos/                 # logo_newwine.png + logo_md.png
    │   ├── manifest.webmanifest   # PWA
    │   └── sw.js                  # Service Worker manuel
    └── src/
        ├── api/                   # Modules API (auth, me, admin, public, live, ...)
        ├── components/
        │   ├── admin/             # DataTable, TiptapEditor, ImageUploader
        │   ├── public/            # Navbar, Footer, LiveBadge, LanguageSwitcher
        │   └── ui/                # Button, Input, Spinner
        ├── hooks/                 # useAuth, useLive
        ├── layouts/               # PublicLayout, AuthLayout, MemberLayout, AdminLayout
        ├── locales/{fr,en}/       # i18next
        ├── pages/
        │   ├── public/            # Home, SermonsPage, EventsPage, BlogPage, DonatePage, ContactPage, LivePage, ...
        │   ├── auth/              # Login, Register, ForgotPassword, ResetPassword
        │   ├── member/            # MyDashboard, MyProfile, MyDonations, MyEvents, MyCell, ChangePassword
        │   └── admin/             # 18 pages admin lazy-loaded
        ├── store/                 # Zustand : authStore, liveStore, uiStore
        ├── styles/globals.css     # Charte graphique + composants Tailwind
        ├── App.jsx                # Routeur (lazy admin)
        ├── echo.js                # Laravel Echo + Reverb
        └── main.jsx               # Bootstrap + Service Worker
```

---

## 🛡️ Sécurité

- **Password policy** : 10 chars min en prod (uncompromised HaveIBeenPwned), 8 chars en dev, mixedCase + chiffre + symbole
- **Rate limiting** nommé : login (5/5min email+IP), register (5/h IP), password-reset (3/15min), avatar upload (10/jour user)
- **Sanctum dual mode** : SPA cookie HTTP-only OU Bearer token mobile/PWA
- **Anti-énumération** : forgot-password répond toujours 200
- **Anti-fixation session** : régénération après login
- **Tokens Agora HMAC-SHA256** server-side, jamais le secret côté client
- **Permissions Spatie granulaires** : 52 permissions sur 12 modules, 5 rôles hiérarchiques
- **Policies Laravel** : scope capitaine (un capitaine ne voit que SES dépts/cellules)
- **HtmlSanitizer** whitelist stricte sur contenu Tiptap (anti-XSS)
- **Validation MIME réelle** sur tous uploads (`mimetypes:` pas juste extension)
- **EXIF strip automatique** sur images (anti-doxing) via Intervention Image
- **CSRF protection** Sanctum + cookie SameSite
- **Soft delete** systématique (RGPD + historique)
- **Activity Log** Spatie sur User + Donation (traçabilité admin)
- **lockForUpdate** sur opérations critiques (capacité events, confirmation dons)

## ⚡ Scalabilité (pensée millions d'utilisateurs)

- **Index dès la migration** : composés (status+created_at), fullText (sermons + posts), unique pivots
- **Queue jobs** pour ops lourdes : `ProcessAvatarJob`, `ProcessUploadedImageJob` (générique réutilisable), `SendNewsletterBatchJob` (1000 destinataires/lot → 1M abonnés = 1000 jobs parallélisables)
- **Eager loading systématique** (zéro N+1)
- **Pagination obligatoire** sur tous les listings (max 100/200)
- **Cache** : `admin:dashboard` 60s, `site_settings:public` 1h, `sitemap.xml` 1h
- **Code splitting** : admin lazy-loaded → main bundle public **147 KB gzip**, Agora SDK chunk lazy 389 KB uniquement chargé sur `/live`
- **Compression** Gzip + Brotli au build
- **WebP automatique** sur tous les uploads (50-100 KB par image vs 500 KB+ original)

---

## 📺 Live streaming Agora

Pour activer le live :

1. Créer un compte sur https://www.agora.io (gratuit jusqu'à 10 000 minutes/mois)
2. Récupérer **App ID** + **App Certificate** dans la console
3. Renseigner dans `backend/.env` :
   ```
   AGORA_APP_ID=votre_app_id
   AGORA_APP_CERTIFICATE=votre_certificat
   ```
4. L'admin programme un live dans `/admin/live`, le démarre, et le badge "EN DIRECT" apparaît partout via WebSocket Reverb.

---

## 💰 Dons Mobile Money (workflow déclaratif)

Aucune intégration API tierce — workflow simple et fiable :

1. Donateur paie via son app Mobile Money (Orange Money / Wave / MTN MoMo)
2. Reçoit la référence de transfert par SMS
3. Soumet le formulaire `/donner` avec montant + référence
4. Don créé en `status=pending`
5. Admin vérifie dans son app Mobile Money → confirme dans `/admin/dons`
6. Email de reçu envoyé automatiquement (queue)

---

## 📧 Emails brandés

Templates Blade dans `backend/resources/views/emails/` avec layout NWC réutilisable :

- `WelcomeMail` — bienvenue à l'inscription
- `DonationConfirmedMail` — reçu après confirmation admin
- `EventReminderMail` — rappel J-1 et J-3
- Reset password & verification email — Laravel par défaut + style NWC

Tous envoyés via queue (`ShouldQueue`) → réponse HTTP non bloquée.

---

## 📊 Fonctionnalités admin

- **Dashboard** : 8 KPI + 4 alertes + 2 graphiques Recharts (refresh 60s)
- **Membres** : CRUD, filtres (status/role/dept/baptized/trashed), assignRoles avec garde sensible, soft delete + restore, export Excel
- **Départements** (50) : CRUD, assignCaptain transactionnel, gestion membres
- **Cellules** : CRUD, leader, rapports hebdomadaires + validation
- **Sermons** : CRUD, upload thumbnail (queue WebP), togglePublish, séries
- **Événements** : CRUD, cover, gestion inscriptions + check-in
- **Blog** : Tiptap rich editor, image inline, catégories, togglePublish
- **Galerie** : drag-drop multi-upload (20 fichiers max), images + vidéos
- **Prières** : modération, publication mur public, marquer exhaussé
- **Dons** : confirm/reject inline + lockForUpdate, stats, export Excel
- **Newsletter** : compose + abonnés + envoi batch (1000/lot via queue)
- **Live streaming** : Agora token publisher + viewer, broadcast Reverb
- **Paramètres** : édition groupée (identité, contact, branding, social, donation, live), upload logos
- **Journal d'activité** : Spatie ActivityLog filtre par ressource/événement

---

## 🌐 Déploiement production

### Stack recommandée
- Linux (Ubuntu 22.04+) · Nginx · PHP-FPM · MySQL 8 · Redis (cache + queues) · Supervisor (workers)

### Étapes clés

```bash
# Backend
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
php artisan storage:link

# Frontend
cd frontend
npm ci
npm run build
# Servir frontend/dist via Nginx (vhost séparé ou même domaine)
```

### Workers (Supervisor)
```ini
[program:nwc-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/nwc/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
numprocs=4
user=www-data

[program:nwc-reverb]
command=php /var/www/nwc/backend/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
```

### Variables critiques `.env` production
Voir `backend/.env.production.example`. Points vitaux :
- `APP_ENV=production`, `APP_DEBUG=false`
- `APP_URL=https://newinechurch.org`
- `SESSION_DOMAIN=.newinechurch.org` (point devant pour partager les sous-domaines)
- `SANCTUM_STATEFUL_DOMAINS=newinechurch.org,www.newinechurch.org`
- `BROADCAST_CONNECTION=reverb`, `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis`
- `MAIL_MAILER=smtp` (ou `ses` / `postmark` / `resend`)
- `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE`

### Sauvegardes auto (Spatie Backup déjà installé)
```bash
php artisan backup:run    # à programmer en cron quotidien
```

---

## 🔍 SEO

- `/sitemap.xml` dynamique (sermons, events, posts publiés, cache 1h)
- `/robots.txt` (autorise pages publiques, bloque admin/api/mon-espace)
- Meta OpenGraph + Twitter Cards dans `index.html`
- URLs FR-friendly : `/messages`, `/evenements`, `/donner`, `/connexion`, ...

---

## 🧪 Test API rapide

```bash
# Login admin → token
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@newinechurch.org","password":"Admin@NWC2025!","device_name":"cli"}' \
  http://localhost:8000/api/auth/login

# Avec le token (extraire ".token") :
TOKEN="..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/admin/dashboard
```

---

## 📝 Licence

Code propriétaire — New Wine Church © 2026.
Maison mère : Église La Maison de la Destinée.

Identifiants après reseed
Admin : admin@newinechurch.org / Admin@NWC2025!
Pasteur : pasteur@newinechurch.org / Pasteur@NWC2025!
RH : rh@newinechurch.org / Rh@NWC2025!
Gouverneur : dorcas.yao@nwc-test.org / Gouverneur@NWC2025!