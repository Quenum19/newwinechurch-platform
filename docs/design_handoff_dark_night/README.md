# Handoff : A DARK NIGHT IN ELEGANCE — NEW WINE

## Overview
Deux supports visuels pour la soirée de gala « A Dark Night in Elegance » (bal & dine gala) organisée par l'église **NEW WINE**, le **24 juillet**, à **La Maison de la Destinée – Riviera Bonoumin, Rue 65** :

1. **Programme officiel imprimable** — livret A5 (couverture + déroulé chronologique de la soirée), destiné à l'équipe opérationnelle (MC, régie son & lumière, protocole, service).
2. **Cadre photo réseaux sociaux** — un masque/overlay doré posé sur les photos du bal avant publication.

Identité : noir profond dominant, or / doré métallique pour titres et ornements, touches de bordeaux/rouge sombre en accent. Ambiance « bal royal », luxe nocturne.

## About the Design Files
Les fichiers de ce bundle sont des **références de design réalisées en HTML** (prototypes montrant l'apparence et le comportement voulus), **pas du code de production à copier tel quel**. La tâche est de **recréer ces designs dans l'environnement du codebase cible** (React, Vue, etc.) avec ses patterns/librairies établis — ou, s'il n'y a pas encore d'environnement, de choisir le framework adapté et d'y implémenter les designs.

Les `.dc.html` sont des « Design Components » : ils s'ouvrent seuls dans un navigateur. Ne recréez pas le runtime maison — lisez la structure, les styles inline et la logique (`renderVals()`), puis reproduisez-les avec vos outils.

## Fidelity
**Haute fidélité (hifi)** — couleurs, typographie, espacements et compositions sont finaux. À recréer fidèlement.

---

## Écran 1 — Programme (livret A5)
Fichier : `Programme A Dark Night in Elegance.dc.html`. Bâti sur `<doc-page>` (pagination explicite), format **A5 portrait 148mm × 210mm**, pleine page (fond perdu, marge 0). 3 pages `<section class="page">`.

### Page 1 — Couverture
- Fond radial noir chaud ; double filet or (inset 7mm + 8.6mm) ; ornements en losange dorés.
- En-tête : « NEW WINE » (Cinzel 600, 10pt, letter-spacing .52em) + « vous convie à son bal » (Cormorant italique).
- Titre : « A » (Cinzel 19pt) / **DARK NIGHT** (Cinzel 800, 33pt, or) / séparateur « — IN — » / **Elegance** (Great Vibes script, 52pt, or).
- Sous-titre italique : « Une nuit de prestige, d'élégance et de souvenirs inoubliables. »
- Bloc infos 3 colonnes séparées par filets verticaux : DATE `24 Juillet` · HEURE `Dès 18h` · LIEU `La Maison de la Destinée`. Sous-ligne : « Riviera Bonoumin · Rue 65 ».
- Pied : « PROGRAMME OFFICIEL DE LA SOIRÉE ».

### Pages 2–3 — Chronologie (déroulé)
Tableau à 3 colonnes : **Heure | Séquence | Responsable**. Grille CSS `grid-template-columns: 27mm 1fr 33mm`, gap 3.5mm. En-tête filets haut/bas. Lignes alternées (rayure très subtile), lignes « temps forts » sur fond bordeaux avec liseré or à gauche.

Données (fidèles au fichier source `TIMING BAL NEW WINE`, horaires rendus continus, format `HHhMM`) :

| Heure | Séquence | Responsable | Temps fort |
|---|---|---|---|
| 18h00 – 18h45 | Arrivée des invités | MC | |
| 18h45 – 20h30 | Mur des stars & cocktail | MC | |
| 20h30 – 21h30 | Installation en salle · animation live | MC | |
| 21h30 – 21h40 | Dancing stars — 1ère prestation | MC | |
| 21h40 – 21h50 | Mot de bienvenue | MC | ★ |
| 21h50 – 23h30 | Repas · vidéo Roi & Reine (vote des invités) | Restauration & Régie | ★ |
| 23h30 – 00h30 | Intervention du Pasteur Principal | Pasteur Georges Amoako | ★ |
| 00h30 – 00h40 | Défilé — 1er passage | MC | |
| 00h40 – 00h55 | Prestations rappeurs | Kim B & son staff | |
| 00h55 – 01h05 | Dancing star | MC | |
| 01h05 – 01h15 | Récap & présentation des départements | Régie | |
| 01h15 – 01h45 | Mot du Pasteur Wahou | Pasteur Wahou | ★ |
| 01h45 – 02h00 | Défilé des organisateurs | MC | |
| 02h00 – 02h10 | Défilé — 2ème passage | MC | |
| 02h10 – 02h20 | 2ème prestation des rappeurs | Kim B & son staff | |
| 02h20 – 02h25 | Proclamation des résultats | Régie | ★ |
| 02h25 – 02h45 | Ambiance DJ | DJ | |
| 02h45 – 03h15 | Jeux & karaoké | MC | |
| 03h15 – 04h50 | Ouverture du bal avec le DJ | DJ | ★ |
| 04h50 – 05h00 | Fin de la cérémonie | MC | ★ |
| 05h00 – 06h00 | Nettoyage | Organisation | |

Page 1 → couverture. Page 2 → 11 premières lignes. Page 3 → 10 dernières + clôture « Élégance · Partage · Souvenirs / Soyons au rendez-vous ! ».

Tailles print (min. lisibilité) : Heure 9.5pt (Cinzel 600), Séquence 12pt (Cormorant 600), Responsable 8pt (Cinzel 500 uppercase), en-têtes 8.5pt.

Tweaks (props) : `showResponsable` (bool, afficher la colonne Responsable), `monochromePreview` (bool, aperçu N&B pour impression sans couleur).

## Écran 2 — Cadre photo réseaux
Fichier : `Cadre Photo A Dark Night.dc.html`. Overlay décoratif posé sur une photo. `<image-slot id="bal-photo">` en fond (drag & drop de la photo), overlay `pointer-events:none` par-dessus. Enveloppé dans `<doc-page width="1350px" height="900px" margin="0">` pour l'export PDF/impression une page.

- Formats (prop `format`) : Paysage 3:2 `1350×900` (défaut), Carré 1:1 `1080×1080`, Portrait 4:5 `1080×1350`, Story 9:16 `1080×1920`. Le bord et les ancrages s'adaptent (inset px).
- **Bordure** : double filet or (inset 22px `2px solid rgba(214,178,95,.95)` + inset 30px `1px solid rgba(214,178,95,.5)`) ; losanges dorés 14px aux 4 coins.
- **Scrims de lisibilité** (prop `showScrim`) : dégradé bas plein largeur fort (`linear-gradient(0deg, rgba(0,0,0,.9)→transparent`, hauteur 46%) ; léger radial haut-droite (46% opacité) ; léger dégradé gauche (9% largeur, 40% opacité). Objectif : photo bien visible, bas assez sombre pour la marque.
- **Badge date (haut droite)** : « 24 » (Cinzel 800, 82px, or) + ruban bordeaux `linear-gradient(180deg,#8a2531,#5f1720)` liseré or, texte « JUILLET » (Cinzel 600, 17px, .34em). Props `dateNumber`, `dateMonth`.
- **Lockup événement (bas droite)** : étoile ★ or 122px (glow) + bloc texte **aligné à droite** : « BAL & DINE GALA » (Cinzel 600, 23px, .26em, crème) / « A DARK NIGHT » (Cinzel 800, 47px, or) / « — IN — » (filets + Cinzel 18px) / « Elegance » (Great Vibes, 82px, or).
- **Logo** (bas gauche) : `assets/logo-newwine.png`, 152×152px, drop-shadow.
- **Wordmark vertical (bord gauche)** : « NEW WINE CHURCH ✦ MAISON DE LA DESTINÉE », `writing-mode:vertical-rl; transform:rotate(180deg)`, Cinzel 600, 15px, .3em, or, centré verticalement.

## Design Tokens
Couleurs
- Noir profond : `#0b0907`, `#0a0806` ; fond radial couverture `#211a10→#0d0a06→#060402`.
- Or métallique (titres/ornements) : `#d8b25f`, `#e6c877`, `#e9c976`, `#eecf80`, `#ecce7d` ; filet or `rgba(214,178,95,.5–.95)`.
- Crème (corps/labels) : `#d9cbb0`, `#f5edd9`, `#f0e6cf`.
- Bordeaux (accent / temps forts) : `#7a1f2b`, ruban `#8a2531`→`#5f1720`, fond ligne `rgba(120,26,38,.42)`.

Typographie (Google Fonts)
- **Cinzel** (serif titres/labels) — 400–900.
- **Cormorant Garamond** (serif corps lisible) — 500/600, italique pour accents.
- **Great Vibes** (script manuscrit) — mots forts « Elegance », « Soyons au rendez-vous ! ».

Ornements : losanges (carré `rotate(45deg)`), filets fins or, séparateur « ✦ » (U+2726), étoile « ★ » (U+2605), diamant séparateur « ◆ ». Aucun SVG dessiné à la main.

## Assets
- `assets/logo-newwine.png` — logo officiel New Wine Church (fond transparent, 500×500). Fourni par le client.
- Les photos du bal sont fournies par l'utilisateur et déposées dans le `<image-slot>` du cadre.

## Files
- `Programme A Dark Night in Elegance.dc.html` — programme A5 (3 pages).
- `Cadre Photo A Dark Night.dc.html` — cadre photo réseaux.
- `doc-page.js` — shell de document paginé/imprimable (référence ; à remplacer par la solution print du codebase).
- `image-slot.js` — placeholder image drag & drop (référence).
- `assets/logo-newwine.png` — logo.

## Notes
- Le programme doit rester **lisible en noir & blanc** (option `monochromePreview`) — l'or devient gris clair sur noir, ce qui reste contrasté.
- Export : le programme et le cadre sont imprimables/exportables en PDF via `<doc-page>` (le composant possède la géométrie `@page` ; ne pas réécrire de CSS d'impression).
- Priorité du programme : clarté du déroulé et des horaires (chaque intervenant repère son top de départ d'un coup d'œil).
