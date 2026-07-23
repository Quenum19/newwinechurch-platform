# Handoff — Slides V2 « A Dark Night in Elegance » (pour Claude Code)

## But
Intégrer les **14 slides V2** de l'écran live du bal (1920×1080) dans l'app React
de la New Wine Church, en **reprenant les animations EXACTEMENT telles qu'elles
sont** — ne rien changer au rendu ni au timing.

## Les 14 slides (ordre du show)
| # | Fichier | Rôle |
|---|---|---|
| 1 | `DefaultSlideV2.dc.html` | Écran d'attente (image de fond via image-slot / `state.event.cover_image`) |
| 2 | `ArriveeSlideV2.dc.html` | Compteur d'arrivées + anneau + dernier arrivé |
| 3 | `MurStarsSlideV2.dc.html` | Annonce « Mur des Stars · Prends ta photo » |
| 4 | `DancingStarsSlideV2.dc.html` | Rideau 3D qui s'ouvre/ferme + **vidéo des danseurs derrière** (`state.video_url`) |
| 5 | `BienvenueSlideV2.dc.html` | Mot d'accueil, lustre, halo |
| 6 | `ProgrammeSlideV2.dc.html` | Déroulé complet (2 colonnes) |
| 7 | `VoteSlideV2.dc.html` | Scrutin Roi & Reine : QR héro + compteur + médaillons |
| 8 | `DefileSlideV2.dc.html` | Défilé red carpet, silhouettes féminines, projecteurs |
| 9 | `RappeursSlideV2.dc.html` | Annonce artiste (`state.config.artiste`) + waveform |
| 10 | `DjSlideV2.dc.html` | DJ, platine, égaliseur, strobe |
| 11 | `ProclamationSlideV2.dc.html` | Climax : couronne, médaillons Roi/Reine, confettis, count-up |
| 12 | `OuvertureBalSlideV2.dc.html` | Portes 3D + countdown 3-2-1 + **feux d'artifice** |
| 13 | `PhotosAmbianceSlideV2.dc.html` | Diaporama photos (`state.photos[]`) |
| 14 | `NoirSlideV2.dc.html` | Écran noir de bascule (fade-in) |

> Visualiseur : `_Preview 17 Slides.dc.html` monte les 14 slides dans un deck
> (flèches ←/→, miniatures). Sert uniquement à prévisualiser — ne pas intégrer.

## ⚠ Reprendre les animations telles quelles
**Toutes les animations sont du CSS pur** : des `@keyframes` (tous préfixés `nw…`)
dans le `<helmet><style>` de chaque fichier + des `animation:` en styles inline.
Aucune lib d'animation, aucun WebGL, aucune dépendance externe.

Pour reproduire **à l'identique**, il suffit de :
1. **Copier chaque bloc `@keyframes nw…` verbatim** dans le CSS global du live
   (ils sont uniques, aucun risque de collision — un seul jeu partagé pour les 14).
2. **Copier le markup** de chaque slide en JSX (styles inline → objets style React ;
   `class`→`className`). Ne pas retoucher les valeurs (durées, delays, courbes,
   tailles de police, dégradés) — c'est ce qui donne le rendu voulu.
3. Les count-up / rotations / cycles vivent dans `componentDidMount` (raf +
   `setInterval`) → porter en `useEffect`. **Garder les mêmes durées** (ex. count-up
   1400-1600 ms, cubic-bezier `.16,1,.3,1`).

> Chaque `*.dc.html` s'ouvre **directement dans un navigateur** (il charge
> `./support.js`, fourni) : ouvre-le pour voir l'animation cible avant de porter,
> puis compare 1:1.

## Comment lire un `*.dc.html`
- **Template** entre `<x-dc>…</x-dc>` : markup + styles inline. Les trous
  `{{ x }}` sont remplis par la classe logique (`renderVals()`).
- **Classe logique** (`<script data-dc-script>`) : `renderVals()` = valeurs
  injectées ; `componentDidMount/WillUnmount` = animations JS ; `this.props.state`
  = prop d'entrée.
- **`this.css(obj)`** : helper objet→chaîne CSS.

## Prop `state` par slide
La signature TS exacte est dans l'attribut `data-props` de chaque fichier (chercher
`"tsType"`). Points clés :
- `DefaultSlideV2` : `event.cover_image`, `event.subtitle`, `event.tag`
- `ArriveeSlideV2` : `stats.arrivees_count | latest_arrival | total_expected`, `messages[]`
- `DancingStarsSlideV2` : **`video_url`** (vidéo de fond ; si absente, image-slot de repli)
- `BienvenueSlideV2` : `welcome_text`, `speaker {name,role,photo}`
- `ProgrammeSlideV2` : `config.program[] {time,label}`
- `VoteSlideV2` : `candidates[] {name,votes,photo}`, `stats.votes_count | total_expected`
- `RappeursSlideV2` : `config.artiste`
- `DjSlideV2` : `config.dj_name`
- `ProclamationSlideV2` : `results.roi {name,votes,photo}`, `results.reine {…}`, `phase`
- `PhotosAmbianceSlideV2` : `photos[] ({url}|string)`

Toutes les valeurs ont un **fallback** dans `renderVals()` (rendu correct sans données).

## Médias déposables (image-slot)
- `DefaultSlideV2` et `DancingStarsSlideV2` utilisent `<image-slot>` (composant
  `image-slot.js` fourni) pour la **preview** — l'utilisateur y dépose une image.
  En prod, remplace par la vraie image/vidéo pilotée par `state` :
  - Default → `<img>`/`background` depuis `state.event.cover_image`
  - DancingStars → le `<video autoplay muted loop playsinline>` (déjà présent,
    activé quand `state.video_url` est fourni) qui apparaît derrière le rideau.
- Les **QR** (Vote) sont des placeholders déterministes → brancher le vrai QR
  (`qrcode.react` ou SVG backend), l'emprise finale est déjà réservée.

## Étapes de portage React (par slide)
1. Ouvrir le `.dc.html` (navigateur) → voir l'animation cible.
2. `frontend/src/pages/live/slides/XxxSlide.jsx` : coller le markup en JSX.
3. Copier les `@keyframes nw…` (une fois) dans le CSS global.
4. Porter `renderVals()` (const/useMemo) + `componentDidMount` (useEffect).
5. **Retirer le `<link>` Google Fonts** (déjà chargé globalement).
6. Brancher `state` (mêmes noms que le `data-props`).
7. Câbler les transitions inter-slides → `TRANSITIONS.md`.

## Design tokens
- Noir `#0A0A0A` `#12080a` `#1a0f14` · Or `#C9A961` `#E6C877` `#EECF80` `#FFE9A8` `#FFF6D8` `#7E662E`
- Ivoire `#F5E6C8` `#F0E6CF` `#D9CBB0` · Bordeaux `#8B1A2F` `#6b1523` `#5f1720`
- Polices : Anton, Cinzel, Great Vibes, Playfair Display, Cormorant Garamond
- Courbe : `cubic-bezier(.16,1,.3,1)`

## Fichiers du dossier
- 14 `*.dc.html` (slides — références de design ouvrables au navigateur)
- `_Preview 17 Slides.dc.html` + `deck-stage.js` (visualiseur, non intégré)
- `support.js`, `image-slot.js` (runtime preview — **pas** à embarquer dans React)
- `TRANSITIONS.md`, `RESSOURCES_EXTERNES.md`, `README_INTEGRATION.md`

> Note : `TRANSITIONS.md` et `RESSOURCES_EXTERNES.md` datent de la 1re livraison et
> citent 3 slides retirées depuis (Installation, Bon Appétit, Fin). La liste
> ci-dessus (14 slides) fait foi.
