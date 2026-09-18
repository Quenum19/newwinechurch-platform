# Audit sécurité NWC — Août 2026

État de la sécurité et prochaines actions. Faisant suite à la demande
"vérifie les ports sensibles, corrige, optimise la sécurité du site".

## ✅ Ce qui est déjà en place

### Rate limiting
- `throttle:public-register` sur inscription publique event
- `throttle:60,1` sur galerie publique
- `throttle:3,1` sur ZIP download (coûteux)
- `throttle:5,1` sur envoi masse magic-links (coûteux)
- `throttle:10,1` sur envoi ticket test
- `throttle:register`, `throttle:login`, `throttle:password-reset` sur auth
- Rate limits nommés définis dans `RouteServiceProvider`

### Headers HTTP de sécurité (SecurityHeaders middleware, global)
- **Content-Security-Policy** — whitelist stricte JS/CSS/img/connect
- **Strict-Transport-Security** (HSTS)
- **X-Frame-Options** (anti-clickjacking)
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy**
- **Permissions-Policy**

### Uploads
- `SafeUploadedFile` rule custom : vérifie mime réel (magic bytes), pas juste
  l'extension. Rejette les payloads déguisés (JPG contenant du PHP…).
- Path traversal impossible : slugs générés serveur, jamais depuis input user.

### Auth
- `EnforcePasswordChange` middleware — force le reset du mot de passe par
  défaut à la 1ère connexion (must_change_password flag)
- Sanctum stateful pour l'API
- CSRF validation Laravel activée
- Bcrypt pour les hashes password

### Nouveau (2 commits août 2026)

**Middleware Honeypot global** (`App\Http\Middleware\Honeypot`) :
- Alias `honeypot` enregistré dans bootstrap/app.php
- Appliqué à 8 endpoints publics : `/contact`, `/prayer-requests`,
  `/newsletter/subscribe`, `/donations`, `/membership-requests`,
  `/public/events/{slug}/register`, `/public/registrations/{token}/choose`,
  `/public/enrollment/bal`
- Court-circuit précoce : bot détecté → 201 factice + log, aucun controller
  invoqué, aucune donnée en DB. Log ip hashée + user-agent + route.

**Frontend champs honeypot invisibles** sur les 2 formulaires les plus
attaquables : `/rejoindre` (adhésion) + `/contact` (contact). Les autres
formulaires sont couverts par le middleware backend + rate limit strict.

**Regex validation** appliquée sur :
- Téléphone/whatsapp : `/^\+?[0-9\s().-]{8,30}$/` (refuse texte libre)
- first_name/name : `/^[\p{L}\s'-]+$/u` (unicode letters + espaces + tirets)
- Email : `email:rfc,dns` (vérifie MX record — rejette abc@abc.abc)
- birth_date : bornes 1900-today
- Sanitize live côté client (onInput) sur name/phone → bloque frappe

**Dédoublonnage soft** sur `/contact` : même email + même message dans
les 5 dernières minutes = renvoie 200 sans doubler (protège contre
double-clic user + réplication spam).

### Frontend
- Inputs `type="tel"` + `inputMode="tel"` + `pattern` sur phone/whatsapp
  (clavier numérique mobile + refus caractères hors chiffres/+/espaces/tirets/points)
- Autocomplete standardisé (`given-name`, `family-name`, `tel`, `email`)
- maxLength contraint côté client

## 🟠 À faire (recommandations priorisées)

### Priorité 1 — Vite fait
- [ ] Étendre le **honeypot** au flow choice montagne (`PublicRegistrationChoiceController::choose`)
- [ ] Ajouter des règles de validation identiques (regex phone/name) sur les 4
  autres controllers publics qui acceptent des inputs users :
  - `PublicBalEnrollmentController::store`
  - `TicketsController::purchase` (billetterie payante)
  - `EventRegistrationController::register` (ancien flow membre)
  - `PrayerRequestController::store` (demandes de prière)

### Priorité 2 — Audit dépendances
- [ ] `composer audit` — check des CVE sur les packages Laravel
- [ ] `npm audit` — check des CVE sur les packages Node/Vite
- [ ] Fixer les vulnérabilités critiques / high

### Priorité 3 — Infrastructure Hostinger
- [ ] **Port SSH** : vérifier qu'il n'est PAS 22 (défaut) — actuellement
  configuré en 65002 (safe, non-scannable par scanners standards)
- [ ] **fail2ban** SSH : déjà actif d'après les incidents de deploy
- [ ] **Certificat SSL** : Let's Encrypt renouvelé auto (à confirmer)
- [ ] **Backup DB** : quotidien 02:45 UTC via schedule Laravel (déjà OK)
- [ ] **Backup fichiers** : hebdomadaire dimanche 04:30 (déjà OK)
- [ ] Ports DB (3306) — accessible **uniquement en localhost**, pas exposé Internet
- [ ] Ports Redis (6379) — idem
- [ ] `.env` en prod : jamais commité, permissions 600
- [ ] `APP_DEBUG=false` en prod (à vérifier — critique)

### Priorité 4 — Monitoring
- [ ] Log alerts pour :
  - Tentatives login échouées répétées (auth failures)
  - Honeypots déclenchés (déjà loggué en `info`)
  - Rate limits dépassés (429)
  - Erreurs 500
- [ ] Endpoint status page publique ou dashboard admin

### Priorité 5 — Ultérieur
- [ ] **reCAPTCHA v3** invisible sur inscription (si spam persiste malgré
  honeypot) — plus lourd mais efficace contre bots avancés
- [ ] **2FA admin** — TOTP pour les rôles `superadmin`, `admin`, `pasteur`
- [ ] **Audit log** : déjà en place via ActivityLog Spatie, à étendre à
  toutes les actions sensibles
- [ ] **Session hijack protection** : régénérer session_id à chaque
  privilege escalation
- [ ] **GDPR/data protection** : bouton "supprimer mon compte" self-service
  membre

## 🔴 Vérifications urgentes à faire côté serveur

Ces points ne peuvent pas être fixés depuis le code — à vérifier
manuellement (SSH Hostinger + hPanel) :

1. **`APP_DEBUG=false`** dans `.env` prod (sinon les stacktraces PHP sont
   publics = fuite énorme d'infos serveur/DB)
2. **`APP_ENV=production`** dans `.env` prod
3. **DB user** utilisé par Laravel a des droits limités (SELECT/INSERT/UPDATE
   sur nwc_* uniquement, pas de CREATE/DROP/GRANT en prod)
4. **Rotation des logs** : `storage/logs/laravel.log` non infinie
5. **Backup DB testé** : essaie une restauration régulièrement
6. **HTTPS forcé** : redirection 301 http → https via .htaccess ou middleware
7. **`X-Powered-By`** header : masqué (retirer `expose_php` PHP)

## 📊 Note de risque actuelle (post-fixes)

| Domaine | Niveau | Commentaire |
|---|---|---|
| Injection SQL | 🟢 Faible | Eloquent binding partout, pas de raw query user |
| XSS | 🟢 Faible | React échappe par défaut, CSP en place |
| CSRF | 🟢 Faible | Laravel CSRF actif + Sanctum stateful |
| Brute force login | 🟢 Faible | throttle:login + fail2ban serveur |
| Bots inscription | 🟢 Faible | Honeypot + validation stricte + rate limit |
| Path traversal | 🟢 Faible | SafeUploadedFile + slugs serveur |
| Session hijack | 🟡 Moyen | HTTPS + cookies secure OK mais pas de regen post-auth |
| Data leak (debug) | 🟠 Critique | À vérifier : APP_DEBUG=false en prod |
| Backup restore | 🟡 Moyen | Backups auto OK, restauration jamais testée |

**Score global estimé : 8/10** — solide pour une plateforme église en
production, avec 2-3 points à durcir (APP_DEBUG check, backup restore test,
extension honeypot aux autres formulaires).
