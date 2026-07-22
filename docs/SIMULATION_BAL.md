# Simulation end-to-end — Bal 2026

Ce guide te permet de tester **toutes les fonctionnalités** du bal en conditions réelles sans toucher au vrai événement (id=3).

## Setup (une seule commande SSH sur Hostinger)

```bash
cd ~/nwc_backend
php artisan nwc:simulate-test-bal --tickets=15 --candidates=8 --accounts
```

Résultat :
- **Nouvel event** `🧪 TEST · A Dark Night in Elegance` cloné depuis le vrai bal (nouveau `event_id`)
- **15 tickets fictifs** avec codes `TESTXXXX` et emails `@test.nwc.local`
- **8 candidats** (4 rois + 4 reines) avec noms plausibles
- **3 comptes de test** (mot de passe `sim2026`) :
  - `sim-accueil@test.local` — rôle **accueil** (scan tickets)
  - `sim-photo@test.local` — rôle **controleur** (upload photos ambiance)
  - `sim-regie@test.local` — rôle **admin** (accès régie complète)

La commande affiche à la fin **l'`event_id` de simulation** et **toutes les URLs de test** — note-le.

---

## Checklist de test

Remplace `{SIM_ID}` par l'ID affiché à la fin du seed.

### 1. Billetterie (accueil / arrivées)

- [ ] Se connecter en `sim-accueil@test.local` sur https://newinechurch.org/connexion
- [ ] Aller sur `/scan?event={SIM_ID}` (ou depuis le menu sidebar)
- [ ] **Tester scan manuel** : taper un des short codes `TESTXXXX` affichés à la fin du seed → vérifier le check-in
- [ ] Aller sur `/admin/evenements/{SIM_ID}/presence` → vérifier que l'arrivée apparaît en temps réel
- [ ] Vue kiosque : `/admin/evenements/{SIM_ID}/presence/kiosque`

### 2. Régie écran live

- [ ] Se connecter en `sim-regie@test.local`
- [ ] Ouvrir la régie : `/admin/bal/{SIM_ID}/regie`
- [ ] Sur un 2ᵉ écran (ou 2ᵉ onglet) : `/live/bal/{SIM_ID}` puis F11
- [ ] **Tester chaque slide** depuis la régie : Affiche, Arrivée LIVE, Mur des stars, Programme, Bienvenue, Défilé, Rappeurs, DJ, Ouverture, Fin, Écran noir
- [ ] Vérifier que la slide "Photos ambiance" reste dispo (même vide)

### 3. Vote Roi & Reine (workflow complet)

- [ ] Depuis la régie : **Ouvrir le vote**
- [ ] Sur ton téléphone : scanner le QR ou aller sur `/bal/vote/{SIM_ID}`
- [ ] Saisir un short code `TESTXXXX` reçu par email (utiliser un ticket qui n'est pas encore utilisé)
- [ ] Voter Roi + Reine → vérifier confirmation
- [ ] Retester avec le même code → doit être refusé (1 vote max/ticket)
- [ ] Depuis la régie : **Clôturer le vote** puis **Proclamer**
- [ ] Vérifier l'animation résultats sur l'écran live

### 4. Photos ambiance (cadre Dark Night)

- [ ] Se connecter en `sim-photo@test.local`
- [ ] Aller sur `/admin/bal/{SIM_ID}/photos`
- [ ] **Uploader 3-4 photos** (n'importe quelles photos test)
- [ ] Vérifier badge "brandé" sur chaque
- [ ] Télécharger les 4 versions : TV · 3:2 · 1:1 · Story → vérifier le cadre "A Dark Night" sur chacune
- [ ] Depuis la régie → slide **"Photos ambiance"** → vérifier défilé plein écran sur `/live/bal/{SIM_ID}`

### 5. Enrôlements "Rejoindre la NWC"

- [ ] Sur ton téléphone : `/nwc/follow?event={SIM_ID}` (ou scanner le QR follow us imprimé depuis les supports de table)
- [ ] Cliquer **"Rejoindre la New Wine Church"**
- [ ] Remplir le formulaire (prénom, nom, tél, lieu d'habitation) + choisir "Découvrir" ou "Servir dans un département"
- [ ] Soumettre → vérifier confirmation
- [ ] Se connecter en `sim-regie@test.local` → `/admin/evenements/{SIM_ID}/enrolements`
- [ ] Vérifier que l'enrôlement apparaît avec le bon département
- [ ] **Tester export Excel** + **PDF paysage**
- [ ] Changer le statut inline → vérifier persistence
- [ ] Éditer les notes admin → vérifier

### 6. PDF supports table (QR paramétré)

- [ ] Depuis la fiche event admin : télécharger le PDF supports de table
- [ ] Vérifier que le QR "Suis-nous" contient bien `?event={SIM_ID}`
- [ ] Scanner ce QR → doit ouvrir `/nwc/follow?event={SIM_ID}`

---

## Reset partiel (garder le seed, effacer les données de test)

Pas de commande dédiée — supprime manuellement depuis l'admin :
- Arrivées : `/admin/evenements/{SIM_ID}/presence` (bouton reset check-in)
- Votes : requête SQL `DELETE FROM bal_votes WHERE event_id={SIM_ID}`
- Photos : `/admin/bal/{SIM_ID}/photos` (bouton corbeille par photo)
- Enrôlements : `/admin/evenements/{SIM_ID}/enrolements` (bouton corbeille par ligne)

Ou plus radical : `--reset` recrée l'event à zéro (perd les tickets aussi) :

```bash
php artisan nwc:simulate-test-bal --tickets=15 --candidates=8 --accounts --reset
```

---

## Destruction complète (fin de la simulation)

Quand tu as fini de tester, une seule commande efface tout proprement :

```bash
cd ~/nwc_backend
php artisan nwc:simulate-test-bal --destroy
```

Cela supprime :
- L'event de simulation
- Tous ses tickets, candidats, votes, photos, enrôlements associés
- Les 3 comptes `sim-*@test.local`

**Le vrai event bal (id=3) et ses données restent intactes.**

---

## Astuces

- **Emails test** (`@test.nwc.local`) ne sont pas envoyés en vrai — inscris-toi avec ta vraie adresse sur `/billetterie/{SIM_SLUG}` pour recevoir un vrai email de ticket
- Les short codes affichés à la fin du seed sont ceux à utiliser pour le vote (car ils existent en BDD)
- La régie ne partage pas de state avec le vrai bal (event séparé) → aucun risque de collision
