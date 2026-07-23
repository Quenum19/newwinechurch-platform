# RESSOURCES EXTERNES — « A Dark Night in Elegance » V2

Inventaire de **toutes** les ressources utilisées par les 17 slides. Objectif :
**zéro dépendance runtime externe** (conforme au brief). Tout est soit une police
Google déjà chargée globalement, soit du **SVG inline** dessiné à la main, soit du
**CSS pur** (dégradés, box-shadow, keyframes).

---

## 1. Polices (déjà chargées globalement dans `BalLiveScreen.jsx`)

Chaque `.dc.html` recharge le `<link>` Google Fonts en tête pour être **autonome**
en preview. **En réintégration React, supprime ce `<link>`** — les fonts sont déjà
chargées au niveau du layout live.

| Police | Usage dans les slides |
|---|---|
| **Anton** | Compteurs XXL (Arrivée, Vote), noms cris (DJ, Défilé, Rappeurs), chiffres clés (Fin), countdown (Ouverture) |
| **Cinzel** | Labels nobles, kickers, « NEW WINE CHURCH », légendes de rôle |
| **Great Vibes** | Mots signature : « Elegance », « Bienvenue », « Bon appétit », « Merci », « Souvenirs », « du Bal » |
| **Playfair Display** (italic) | Sous-titres poétiques, phrases tournantes, noms candidats |
| **Cormorant Garamond** | Corps de texte long, descriptions, citations |

Aucune autre police. Aucune n'est téléchargée en base64.

---

## 2. SVG inline (dessinés à la main — aucun fichier externe)

| Ressource | Slide | Description |
|---|---|---|
| **Couronne royale** | `ProclamationSlideV2` | 5 pointes + bandeau, dégradés or `#FFF6D8→#E6C877→#7E662E`, jewels bordeaux `#8B1A2F`, facette qui scintille (`nwFacet`). Remplace l'emoji 👑. |
| **Anneau de progression** | `ArriveeSlideV2` | `<circle>` SVG, `stroke-dasharray/offset` animé, dégradé `nwGold`. Ratio arrivées/attendus. |
| **Lustre** | `BienvenueSlideV2` | Chandelier suspendu, ellipses + pampilles or, oscillation `nwChand`. |
| **Cloche de service** | `BonAppetitSlideV2` | Cloche argentée-or + fumée animée (`nwSmoke`). |
| **Micro** | `RappeursSlideV2` | Micro or custom (grille + pied). Remplace l'emoji 🎤. |
| **Platine + vinyle** | `DjSlideV2` | Disque `repeating-radial-gradient` qui tourne (`nwSpinDisc`) + label bordeaux. |
| **Faux QR code** | `VoteSlideV2`, `MurStarsSlideV2` | Motif déterministe en `box-shadow` (placeholder). **À REMPLACER** par le vrai QR (voir §4). |

Tous les SVG sont directement dans le template — rien à encoder, rien à héberger.

---

## 3. Effets CSS purs (particules, lumière, 3D)

Aucune bibliothèque de particules. Tout en CSS/keyframes :

| Effet | Technique | Slides |
|---|---|---|
| Particules or montantes | `<div>` radial-gradient + `nwRise` | Default, Arrivée, Installation, Bienvenue, Programme |
| Étoiles scintillantes ✦ | glyphe Cinzel + `nwTwinkle` | MurStars, Bienvenue, Vote, Défilé |
| Confettis 3D | `nwConfetti` (rotateZ/X) + `nwSway` | Proclamation |
| Braises qui tombent | `nwFall` | Fin |
| Projecteurs / faisceaux | `linear-gradient` + `blur()` + `nwSweep`/`nwBeam` | Arrivée, MurStars, DancingStars, Défilé, Rappeurs |
| Rideau 3D à plis | `perspective` + `nwFold` + sheen | DancingStars |
| Podium 3D | `rotateX(62deg)` | Défilé |
| Portes 3D | `rotateY` + `perspective(1600px)` | OuvertureBal |
| Feux d'artifice | rayons `rotate()` + `nwFireLaunch`/`nwFireBurst` | OuvertureBal |
| Strobe dancefloor | `mix-blend-mode:screen` + `nwStrobe` | DJ |
| Ken Burns | `nwKen` (scale/translate) | Default, PhotosAmbiance, Fin |
| Glow titres | `text-shadow` multi-couches + `nwGlowP` | Toutes |
| Cadre présidentiel | double `border` inset 22/30px + losanges coins | Toutes (sauf Noir) |

---

## 4. Images pilotées par `state` (fournies par le backend au runtime)

Ces slides consomment des URLs d'images **via `state`** — aucune image n'est
embarquée dans les `.dc.html`. En standalone, un **fallback élégant** s'affiche
(monogramme, placeholder sombre, ou hero typographique).

| Prop `state` | Slide | Fallback standalone |
|---|---|---|
| `state.event.cover_image` | Default, Arrivée | Hero typographique / dégradé radial |
| `state.candidates[].photo` | Vote | Avatar dégradé + initiale |
| `state.results.roi/reine.photo` | Proclamation | Monogramme Great Vibes dans cadre or |
| `state.speaker.photo` | Bienvenue | Initiale dans médaillon bordeaux |
| `state.photos[]` | PhotosAmbiance, Fin | Écran « Souvenirs » typographique |

### QR codes (À BRANCHER en réintégration)
Les slides **Vote** et **MurStars** affichent un **faux QR** (placeholder visuel).
Remplace-le par le vrai QR généré côté app :
- **Vote** : URL de vote `\`/vote/${state.event.id}\`` → générer un SVG QR (ex.
  lib `qrcode.react` déjà courante, ou SVG backend). Conserver le cadre blanc
  arrondi + l'anneau `nwRipple`.
- **MurStars** : URL de partage `#BalNWC2026` → idem, conserver le sweep `nwSweepH`.

> Le placeholder actuel occupe exactement l'emprise finale (220×220 px pour Vote,
> 154×154 px pour MurStars) — le vrai QR se glisse dedans sans casser la mise en page.

---

## 5. Ce qui a été volontairement ÉVITÉ

- ❌ **Lottie** — non nécessaire ; tous les mouvements sont couverts par CSS/SVG,
  donc aucun JSON externe, aucun player à installer.
- ❌ **WebGL / three.js** — la profondeur vient des CSS 3D transforms (brief respecté).
- ❌ **Emojis** (👑 🎤 🔥) — remplacés par SVG or custom.
- ❌ **Images d'ornements hébergées** — tout est vectoriel inline.
- ❌ **Polices hors charte** — strictement les 5 Google Fonts du brief.

---

## 6. Rappel réintégration React (par slide)

Pour chaque `XxxSlideV2.dc.html` :
1. Retirer le `<link>` Google Fonts du `<helmet>` (déjà global).
2. Déplacer les `@keyframes` du `<helmet><style>` vers le CSS global du live (ou
   un CSS module) — ils sont préfixés `nw…`, sans collision.
3. Transposer la logique `renderVals()` → composant React : les valeurs dérivées
   deviennent des `const`/`useMemo`, les `componentDidMount` (count-up, rotations,
   diaporama) → `useEffect` + Framer Motion `useSpring`/`useMotionValue`.
4. Remplacer les faux QR (§4) par le vrai QR.
5. Câbler les `exit` de transition (voir `TRANSITIONS.md`).
6. La prop `state` garde exactement la signature documentée dans le `data-props`
   de chaque `.dc.html` (bloc `tsType`).
