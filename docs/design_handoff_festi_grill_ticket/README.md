# Handoff — E-ticket « Festi Grill'26 » (NEW WINE CHURCH)

## Overview
E-ticket officiel de l'événement **Festi Grill'26** (barbecue / repas d'église, Abidjan).
Il remplace le PDF actuel, jugé trop sobre : même information, direction artistique « braise / street / jeune ».
Sortie attendue : **HTML rendu à l'écran + export PDF/PNG envoyé par e-mail**, avec QR code de contrôle à l'entrée.

## About the Design Files
`ticket.html` est une **référence de design** : un prototype HTML/CSS qui montre le rendu et la mise en page voulus, **pas du code de production à copier tel quel**.
La tâche est de **recréer ce design dans l'environnement du projet cible** (Next.js/React, Laravel Blade, template e-mail, générateur PDF type Puppeteer/wkhtmltopdf…) en suivant ses conventions existantes. Si aucun environnement n'existe encore, choisir le plus adapté (recommandation : **Next.js + route d'export PDF via Puppeteer**, ou un simple template serveur si l'app est déjà en PHP/Node).

Le fichier utilise **uniquement des styles inline + Google Fonts** : aucune dépendance, ouvrable directement dans un navigateur.

## Fidelity
**High-fidelity.** Couleurs, typographies, tailles et espacements sont définitifs — les reproduire au pixel. Les seules variables sont les données du ticket et les deux images.

## Écran unique : E-ticket (largeur de la carte : 860 px)
Page : `min-height:100%`, fond `radial-gradient(120% 60% at 50% 0%, #3a1206 0%, #140906 55%, #080605 100%)`, contenu centré en colonne, `gap:28px`, `padding:48px 24px 64px`, police `Archivo`.

Carte ticket : `width:860px`, `background:#16100c`, `border-radius:28px`, `overflow:hidden`, `box-shadow:0 40px 90px rgba(0,0,0,.75), 0 0 0 1px rgba(249,178,42,.22)`, plus un calque de texture `repeating-linear-gradient(135deg, rgba(255,255,255,.022) 0 2px, transparent 2px 7px)` en `position:absolute;inset:0;pointer-events:none`.

Blocs de haut en bas :

1. **Barre d'en-tête** — `padding:18px 34px`, `background:linear-gradient(90deg,#f2591f,#f9b22a)`, texte `#1a0d05`. À gauche : pastille 34×34 `border-radius:50%` fond `#2a0a1d`, lettre en `Permanent Marker` 17px `#f9b22a` (**à remplacer par le vrai logo New Wine Church**, même gabarit) + « NEW WINE CHURCH » 15px/800/`letter-spacing:.14em` et « E-TICKET OFFICIEL » 11px/600/`.22em`, opacité .72. À droite : pilule « ADMIT ONE », `JetBrains Mono` 12px/700, fond `#1a0d05`, texte `#f9b22a`, `padding:7px 14px`, `border-radius:999px`.
2. **Titre** — `padding:34px 34px 26px`, centré, halo `radial-gradient(60% 100% at 50% 0%, rgba(242,89,31,.35), transparent 70%)` sur 180px de haut. « Festi » : `Permanent Marker` 46px `#fff`, `rotate(-3deg)`. « GRILL'26 » : `Anton` 132px, `line-height:.82`, `#f9b22a`, `letter-spacing:-.02em`, `text-shadow:0 6px 0 rgba(0,0,0,.35)`. Sous-titre pilule « MEILLEURES VIANDES · ALLOCO & ATTIÉKÉ » 15px/700/`.1em`, `#efe3d8`, fond `rgba(255,255,255,.06)`, bord `1px solid rgba(249,178,42,.3)`, `padding:9px 18px`, `border-radius:999px`.
3. **Bandeau photo** — `height:230px`, `margin:0 34px`, `border-radius:18px`, image `object-fit:cover` + voile `linear-gradient(180deg, rgba(22,16,12,.55) 0%, transparent 40%, rgba(22,16,12,.85) 100%)`. En bas à gauche, deux badges `JetBrains Mono` 11px/700/`.14em` : « SAM. 12 SEPT. 2026 » (fond `#f9b22a`, texte `#1a0d05`) et « 15H00 » (fond `rgba(26,13,5,.85)`, bord `rgba(249,178,42,.4)`, texte `#f9b22a`).
4. **Menu / Accompagnement** — grille 2 colonnes, `gap:14px`, `padding:26px 34px 6px`. Cartes : fond `rgba(255,255,255,.045)`, bord `rgba(255,255,255,.07)`, `border-radius:16px`, `padding:16px 18px`. Titres 11px/800/`.2em` `#f2591f`. Chips : 13px/700 `#f6ece3`, fond `rgba(249,178,42,.12)`, `padding:6px 11px`, `radius:8px`, en `flex-wrap` `gap:7px`. Contenus : Porc braisé / Porc sauté / Poulet braisé — Alloco / Attiéké / Frites.
5. **Lieu + Type de place** — grille 2 colonnes, `padding:14px 34px 30px`. Lieu : label 11px/800/`.2em` `#8d7f74`, « Maison de la Destinée · Bonoumin » 16px/800 `#fff`, « Riviera Bonoumin, Rue 65, Abidjan » 13px `#b6a79b`. Type : fond `linear-gradient(135deg, rgba(242,89,31,.22), rgba(249,178,42,.12))`, bord `rgba(249,178,42,.35)`, « ENTRÉE GRATUITE » en `Anton` 30px `#fff`, sous-ligne « Place Festi Grill — 1 personne » 12px/600 `#e4cdb8`.
6. **Perforation** — barre `height:2px`, `repeating-linear-gradient(90deg, rgba(249,178,42,.45) 0 12px, transparent 12px 24px)` + deux cercles 38px de la couleur du fond de page (`#080605`) débordant à `left:-19px` / `right:-19px`, `top:-18px`.
7. **Souche (stub)** — grille `auto 1fr`, `gap:26px`, `padding:30px 34px 26px`. QR : 150×150 dans un cadre blanc `padding:10px`, `border-radius:14px`, légende « SCAN À L'ENTRÉE » 11px/800/`.16em` `#f9b22a`. À droite : label « AU NOM DE » puis nom en `Anton` 34px `#fff` ; deux encarts `JetBrains Mono` 14px pour « N° TICKET » et « COMMANDE » (fond `rgba(255,255,255,.045)`, `radius:12px`, `padding:11px 13px`) ; mention « Ticket individuel, à usage unique. Non cessible. » 12px `#b6a79b`.
8. **Pied de carte** — `border-top:1px solid rgba(255,255,255,.07)`, assistance « +225 07 57 07 67 74 » 12px `#b6a79b` (numéro en `#f6ece3`), et « WWW.NEWWINECHURCH.ORG » `JetBrains Mono` 11px/`.16em` `#f9b22a`.
9. **Sous la carte** — deux encarts d'aide (« COMMENT ÇA MARCHE », « TON TICKET EN LIGNE »), puis mentions légales 10px `#6f635a` centrées.

## Données dynamiques (placeholders dans `ticket.html`)
| Placeholder | Source | Exemple |
|---|---|---|
| `{{HOLDER_NAME}}` | nom de l'inscrit | Ticket TEST |
| `{{TICKET_NUMBER}}` | n° de ticket, formaté par blocs de 4 | 4523 0521 0511 772 |
| `{{ORDER_REF}}` | n° de commande | TEST-B3QNJH |
| `{{QR_IMAGE_URL}}` | PNG/dataURL du QR (voir plus bas) | data:image/png;base64,… |
| `{{HERO_IMAGE_URL}}` | photo grillades (asset fourni) | /assets/festi-grill-hero.jpg |

Champs constants à externaliser dans une config d'événement (`event.json`) plutôt qu'en dur : titre, date, heure, lieu, adresse, menu, accompagnements, type de place, téléphone, site.

## QR code
- Contenu : identifiant opaque du ticket (UUID ou HMAC signé), **pas** de données personnelles. Ex. `https://newwinechurch.org/t/<uuid>`.
- Génération côté serveur : `qrcode` (Node) ou `endroid/qr-code` (PHP), niveau de correction **M**, marge 0, taille ≥ 600 px rendue à 150 px, noir sur blanc pur (garder le cadre blanc du design pour le contraste au scan).
- Validation : un seul scan valide ; marquer `checked_in_at` en base, refuser les scans suivants.

## Comportement
- **Pas d'interaction obligatoire** : c'est un document. Un seul état.
- Impression / PDF : `@page { size: A4 portrait; margin: 0 }`, fond conservé (`-webkit-print-color-adjust: exact` si Puppeteer, `printBackground: true`).
- Version e-mail : ne pas envoyer ce HTML tel quel (gradients, flex, Google Fonts non fiables en client mail). **Rendre le ticket en PNG/PDF et l'attacher**, avec un e-mail HTML simple en tableaux.
- Responsive écran : sous 900 px, passer la carte en `width:100%;max-width:860px`, réduire « GRILL'26 » via `clamp(64px, 15vw, 132px)`, et passer les grilles 2 colonnes en 1 colonne. La souche reste lisible : QR au-dessus du nom.
- Accessibilité : `alt` explicite sur le QR, contraste — éviter de descendre les textes gris sous `#b6a79b` sur `#16100c`.

## Design tokens
```
--bg-page-top     #3a1206
--bg-page-mid     #140906
--bg-page         #080605
--card            #16100c
--ink-strong      #ffffff
--ink             #f6ece3
--ink-muted       #b6a79b
--ink-label       #8d7f74
--ink-legal       #6f635a
--accent-yellow   #f9b22a
--accent-orange   #f2591f
--accent-deep     #1a0d05
--logo-plum       #2a0a1d
surface-soft      rgba(255,255,255,.045)
border-soft       rgba(255,255,255,.07)
border-accent     rgba(249,178,42,.30)
chip-fill         rgba(249,178,42,.12)
radius            8 / 12 / 14 / 16 / 18 / 28 / 999
spacing           6 7 10 12 14 16 18 26 30 34 48
shadow-card       0 40px 90px rgba(0,0,0,.75)
```
Typographie : **Anton** (titres, `GRILL'26`, nom, « ENTRÉE GRATUITE »), **Permanent Marker** (« Festi », logo lettre), **Archivo** 400–800 (corps, labels), **JetBrains Mono** 400/700 (codes, badges, URL). Auto-héberger ces fontes pour le rendu PDF serveur.

## Assets à fournir / remplacer
1. **Logo New Wine Church** (SVG, fond transparent) → remplace la pastille lettre dans l'en-tête.
2. **Photo grillades** (JPG ≥ 1720×460, sombre, braise visible) → bandeau photo. Celle du flyer existant convient.
3. Fontes Google listées ci-dessus (à auto-héberger).

## Fichiers de ce bundle
- `ticket.html` — le design de référence, autonome, avec les placeholders `{{…}}`.
- `README.md` — ce document.

## Prompt à donner à Claude Code
> Implémente l'e-ticket décrit dans `design_handoff_festi_grill_ticket/README.md`, en reproduisant fidèlement `ticket.html` dans notre stack existante. Crée un composant/template `EventTicket` recevant `{ holderName, ticketNumber, orderRef, qrUrl, event }`, externalise les constantes de l'événement dans une config, génère le QR côté serveur à partir d'un UUID signé, et ajoute une route d'export PDF A4 (fonds imprimés, fontes auto-hébergées). Respecte au pixel les tokens et tailles du README ; ne modifie pas la hiérarchie visuelle.
