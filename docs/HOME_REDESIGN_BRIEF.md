# Refonte Home publique NWC — Brief & 3 directions

> Recherche + audit + propositions. Aucun code n'est encore écrit.
> **À lire entièrement avant l'arbitrage.** Trois directions à la fin.

---

## 1. Étude des références

5 sites étudiés (3 fetchés directement, 2 indisponibles → analyse mémoire complétée).

| Site | Hero | Type Typo | Palette | Signal "jeune" |
|---|---|---|---|---|
| **vouschurch.com** (Miami) | Sermon spotlight + carousel d'images, dominante noir/blanc | Webflow custom (Helvetica Now style, lourd) | Noir + blanc + photographie chaude | Carousel sermon en card unique XXL avec play overlay énorme — **pas de halo** |
| **mosaic.org** (LA) | Carousel photo plein écran, "BELIEVE BELONG BECOME" en majuscules massives | Mix serif + sans-serif gros poids | Bleus/teals + neutres chauds, photographie dominante | Headlines en CAPS toutes majuscules courtes ("YOU BELONG HERE") |
| **hillsong.com** | Hero text-only "Welcome Home", densité magazine | Sans-serif modulaire, gold accent | Or + neutres + ink | Structure magazine éditoriale, location finder interactif |
| **hf.church** (Highlands) | Carousel + bento de cards (Small Groups, App, Messages) | System stack | Sombre + accents teal/bleu chauds (image-driven) | Bento ordonné, CTA "WATCH NOW" / "LEARN MORE" en CAPS |
| **elevationchurch.org** | (403 sur fetch — analyse mémoire) Hero vidéo loop, type bold sans-serif XXL, gris/blanc/noir | Custom display sans-serif | Gris + blanc + accent dynamique | Vidéo de fond auto-loop, scroll vertical magazine |

### 5 leçons retenues

1. **Aucune des grandes églises jeunes n'utilise de halo blur bordeaux/or pulsant.** L'accent visuel vient d'une **photo réelle** ou d'une **vidéo de fond** ou d'une **typographie XXL**, jamais d'un effet glow décoratif.
2. **La typographie porte le drame, pas la décoration.** Un headline impact en 8xl-9xl en bottom-left fait plus d'effet qu'un logo géant centré + slogan script.
3. **Asymétrie + bento.** VOUS et HF mettent en place un sermon featured XXL à un endroit + une grille bento de modules secondaires ailleurs — pas 4 sections empilées au centre.
4. **Marquees / tickers** (chaîne défilante). Mosaic et plusieurs jeunes églises utilisent un ticker pour donner du mouvement permanent ("LIVE SUNDAY 1PM • NEW SERIES • JOIN A SMALL GROUP • ..."). Effet "magazine vivant".
5. **CAPS courts + verbes d'action.** "WATCH NOW", "BELIEVE BELONG BECOME", "FIND YOUR COMMUNITY". On évite "Une armée de jeunes pour Christ" qui sonne corporate.

---

## 2. Audit honnête de la home actuelle

Fichier audité : `frontend/src/pages/public/Home.jsx` + `globals.css` + `tailwind.config.js`.

### 8 anti-patterns à fuir (présents dans le code actuel)

1. ❌ **Halo blur bordeaux + or pulsant** au hero (lignes 65-66) — signature visuelle "AI-generated landing page 2024". Tout le monde fait ça.
2. ❌ **Logo géant centré (h-44) + slogan script + heading + subtitle + 2 CTA, tout centré, tout symétrique** — composition "wedding invitation".
3. ❌ **Animations Framer Motion stéréotypées** : opacity + translate-y, delay incrémental 0.4 → 0.6 → 0.9 → 1.1. Ce timing est devenu un cliché.
4. ❌ **Cards uniformes `.card-nwc`** répétées partout (sermons, events, departments) — perd toute hiérarchie. La home doit avoir 1 héros visuel dominant, pas 6 cards égales.
5. ❌ **`SectionHeader` répété 3 fois** avec exactement le même pattern (eyebrow script gold + titre serif + desc gris). Aucun rythme.
6. ❌ **39 départements affichés en 12 cards Heart icon identiques** — tout devient générique. Aucun département ne se démarque visuellement.
7. ❌ **`bg-wine-gradient` en CTA Donner** + **halo or au-dessus** — encore un fade visuel sans intention narrative.
8. ❌ **Slogan "Sauvé pour Sauver" en script Great Vibes doré** — typographie de faire-part. À remplacer par une typo qui parle à une cible 22 ans.

### Ton éditorial actuel — diagnostic

> "Une armée de jeunes pour Christ", "La Parole vive", "Vivons-le ensemble", "Trouve ta place", "Soutiens la mission".

Ce n'est pas mauvais. **Mais c'est neutre, conventionnel, pas signature.** Les sites étudiés disent : *"You belong here"*, *"The future is full of hope"*, *"You were never meant to do life alone"*. Ils prennent **position** et **invitent**. Ils ne se contentent pas de qualifier.

### Pitch émotion (1 phrase)

> *« Un jeune ivoirien de 22 ans découvre la home, fait le screenshot pour son story Instagram, écrit "ma nouvelle famille" — pas "encore un site d'église". »*

C'est le test. Si la home n'arrive pas à provoquer ça, on a perdu.

---

## 3. Trois directions de design distinctes

Les 3 sont **radicalement différentes**, pas 3 variantes de la même idée. Aucune n'utilise la palette bordeaux/or actuelle (réservée à l'admin).

---

### 🎯 Direction A — "Bento Sermon Spotlight"

**En une phrase :** un sermon featured écrase la moitié haute de l'écran avec un play énorme, et tout le reste est un bento pour ceux qui veulent explorer. Pas de halo, pas de slogan script, juste du contenu vivant.

**Inspiration directe :** la *sermon spotlight* de **vouschurch.com** + le bento de **hf.church**, appliqués au sermon le plus récent ou featured de NWC.

**Palette** (neutre + 1 accent franc) :
- `#0A0A0A` — Ink (presque-noir)
- `#F5F0E8` — Bone (crème chaud, fond principal)
- `#E8E0D0` — Sand (surface secondaire)
- `#FF5F2E` — Sunset (accent orange brûlé — pas saturé)
- `#1A1A1A` — Soft black (texte)

**Typo Google Fonts :** **Bricolage Grotesque** (display, lourd, expressif moderne) + **Inter Tight** (UI / body).

**Hero treatment :**
- Layout asymétrique 2 colonnes, **pas centré**.
- Gauche (60%) : sermon featured = thumbnail réelle 16:9, gros bouton play orange-Sunset, titre du sermon en **Bricolage Grotesque 7xl**, référence biblique en small caps mono, durée + speaker en bas. **Pas de logo géant**, le logo NWC reste dans la Navbar.
- Droite (40%) : 4 micro-cards bento (prochain culte, prochain événement, "Rejoindre une cellule", "EN DIRECT" si actif).
- Au-dessus du hero : **marquee horizontale** infinie en CAPS Bricolage qui scroll : `DIMANCHE 13H • COCODY-BONOUMIN • 39 DÉPARTEMENTS • SAUVÉ POUR SAUVER •`

**3 sections après le hero :**
1. **"Cette semaine à NWC"** — bento 4 modules : (a) sermon récent #2, (b) "1 cellule près de chez toi" avec carte interactive de Cocody, (c) "Rejoins-nous dimanche" avec photo + heure, (d) témoignage prière courte (1 ligne).
2. **"39 départements, 1 famille"** — pas une grille uniforme, une **timeline horizontale scrollable** (mobile : swipe) avec 39 modules de tailles variables, fond couleur du département + nom + capitaine. Le module Évangélisation est XXL parce que c'est notre cœur. Les 11 "à pourvoir" ont une bordure pointillée.
3. **"Donne maintenant"** — pas un section gradient bordeaux, mais une bande Sunset (#FF5F2E) avec en gros titre "DONNER PREND 30 SECONDES" + 3 numéros Mobile Money en mono bold, copy-clipboard inline, lien vers la vraie page.

**Motion language signature :**
- Marquee infinie (CSS `animation` linéaire, perf-friendly).
- Bouton play **magnetic** sur le sermon featured (curseur attire).
- Hover sur sermon card → cover scale 1.04 + caption slide-in depuis le bas.

**Anti-modèle (ce que cette direction refuse) :**
Pas de halo blur, pas de logo géant centré, pas de slogan script, pas de CTA gradient, pas de carousel d'avatars, pas d'icône cœur générique pour les départements.

---

### 📰 Direction B — "Editorial Photo-First"

**En une phrase :** une photo plein écran de jeunes en culte, un headline impact "DIEU PARLE. ÉCOUTES-TU ?" en bottom-left, et après ça le site déroule comme un magazine premium avec storytelling vertical.

**Inspiration directe :** **Mosaic.org** ("YOU BELONG HERE") + **Hillsong** structure magazine + **elevationchurch** vidéo de fond.

**Palette** (premium éditorial chaud) :
- `#0F0E0C` — Onyx (presque-noir chaud)
- `#FAF6F0` — Paper (blanc cassé éditorial)
- `#FF6B5C` — Coral (accent vif limité, ~10% des pixels)
- `#D4A574` — Sand peach (rappels chauds)
- `#7A6B5C` — Mocha (texte secondaire)

**Typo Google Fonts :** **Anton** (display ultra-condensé, headlines impact) + **Fraunces** (serif éditorial pour quotes/scripture) + **Inter** (body/UI).

**Hero treatment :**
- Photo plein écran (poster en attendant) d'un culte NWC réel — visages, mains levées, lumière chaude. **Pas de halo, pas d'overlay sombre uniforme**, juste un gradient bottom-up subtil pour lisibilité texte.
- Headline en **bottom-left** : `DIEU PARLE.` (Anton 9xl blanc) + `ÉCOUTES-TU ?` (Anton 9xl Coral).
- Sous-headline en Fraunces italique petit : *« Cocody-Bonoumin, Dimanche 13h. »*
- 1 seul CTA : `WATCH SUNDAY` en outline blanc avec hover Coral fill.
- **Pas de slogan**, pas de logo géant.

**3 sections après le hero :**
1. **"Le dernier message"** — full-bleed, un sermon featured prend toute la largeur. Photo speaker à gauche (50/50), texte XXL à droite (Anton title), pull-quote Fraunces italique en milieu, durée + référence biblique en small caps Inter. Effet *Vogue* pour église.
2. **"Témoignages"** — 3 cards type editorial : photo membre carré + nom + 1 phrase en Fraunces italique XXL ("J'étais perdu. NWC m'a trouvé."). Données réelles : seeder ciblé pour ajouter 3-5 témoignages courts.
3. **"Tu es nouveau ?"** — bande Coral plein écran avec headline Anton 8xl blanc "VIENS COMME TU ES." + 3 boutons (Premier dimanche / Trouve une cellule / Pose une question) en outline.

**Motion language signature :**
- **Scroll-driven parallax** sur les photos (les images bougent à 0.5x du scroll).
- **Quote split-letters** : les pull-quotes apparaissent lettre par lettre avec stagger 30ms.
- Hover sur cards témoignage : la photo désature en N&B, et au hover redevient couleur (effet *Magnum Photos*).

**Anti-modèle :**
Pas de carousel, pas de bento, pas d'animation Framer "fade-up". Pas de logo dans le hero. Pas de halo. Tout passe par photo + typographie impact.

---

### ⚡ Direction C — "Brutalist Gen Z Sticker"

**En une phrase :** une home qui ne ressemble à AUCUN site d'église — typographie variable agressive, stickers tournants, palette multi-couleur saturée, marquee permanent, ça respire l'énergie d'un compte Instagram d'évangélisation tenu par des étudiants.

**Inspiration directe :** mouvance design Gen Z 2024-2025 (Awwwards, brutalism, néo-Y2K) + Mosaic CAPS + irl Église qui ose. *"The church grandma can't keep up with."*

**Palette** (multi-couleur saturée, **5 vraies couleurs**) :
- `#0A0A0A` — Ink (texte + fonds)
- `#FAFAF7` — Off-white (fond principal)
- `#7C3AED` — Violet électrique (accent #1, CTA principaux)
- `#FFE600` — Jaune néon (accent #2, stickers, surlignage)
- `#0066FF` — Bleu azur (accent #3, hover & marquee)

**Typo Google Fonts :** **Space Grotesk Variable** (display, jouer avec wght 300→900 pour expression) + **Geist Mono** (small caps tags) + **Caveat** (handwritten pour citations bibliques manuscrites).

**Hero treatment :**
- Fond **off-white** (pas dark mode — choix audacieux différencié).
- Marquee top en strip jaune néon Ink uppercase Space Grotesk : `🔴 DIMANCHE EN DIRECT 13H • NOUVELLE SÉRIE "L'ARMÉE" • REJOINS UNE CELLULE • SAUVÉ POUR SAUVER •`
- Texte hero asymétrique : `tu es` (caveat handwritten 6xl) `INVITÉ` (Space Grotesk variable 9xl black, inclinaison -3°). En dessous : `À UNE GÉNÉRATION RADICALE.` (Space Grotesk 5xl, fond surligné jaune néon partiellement).
- Sticker rotatif circulaire violet bottom-right : "★ SUNDAY 13H ★ COCODY ★" qui tourne en boucle 20s.
- Photo polaroïd de jeunes du culte, légèrement inclinée, frame blanche, à droite.
- 2 CTA : `[Voir les messages →]` (violet plein) + `[Premier dimanche ?]` (outline ink).

**3 sections après le hero :**
1. **"Cette semaine"** — grille brutaliste 12 colonnes asymétriques. 1 sermon XXL prend 8 cols, 4 events petits prennent 4 cols, le tout avec **borders 2px ink**, pas de border-radius.
2. **"Trouve ton crew"** — 39 départements en grille bento avec couleurs variées (chaque dept sa couleur + emoji + nom en Space Grotesk Black). Hover = sticker rotation. Les 11 "à pourvoir" sont des stickers vides "+ CRÉE-LE" qui pulsent jaune.
3. **"Donner = Aimer"** — fond Bleu azur, headline en yellow Caveat handwritten "donner ne tue pas." (référence bib subtle), sous-titre Space Grotesk "30 SECONDES, 3 OPÉRATEURS, 1 GENERATION FINANCÉE." + 3 buttons Mobile Money.

**Motion language signature :**
- **Sticker rotation infinite** (CSS keyframes 20s linear).
- **Magnetic cursor** sur tous les boutons primaires.
- **Marquee top permanent** (jamais arrêtée).
- **Surlignage jaune** qui s'anime de gauche à droite sur scroll-into-view (effet de ligne tracée).
- Hover sur cards département : rotation -2°/+2° aléatoire + scale 1.05.

**Anti-modèle :**
**Pas de dark mode**, pas de halos, pas de Framer fade-up sage, pas de typographie premium éditoriale, pas d'image de hero plein écran. Refuse le "premium" — embrasse l'énergie brute "fait par et pour les jeunes".

---

## 4. Comparatif rapide pour arbitrer

| Critère | A — Bento Spotlight | B — Editorial Photo | C — Brutalist Gen Z |
|---|---|---|---|
| Audace | Modéré (sûr) | Élevé (premium) | Maximal (clivant) |
| Risque | Faible | Moyen | Élevé (peut diviser) |
| Effet "screenshot Instagram" | 7/10 | 8/10 | 10/10 |
| Effort de contenu | Standard (sermons, events) | Élevé (photos pro requises) | Moyen (stickers + textes courts) |
| Crédibilité institutionnelle | Forte | Très forte | Polarisante |
| Risque "déjà vu" | Moyen (VOUS-like) | Bas | Très bas |
| Mobile-first 360px | Très bon | Bon (photos lourdes attention) | Excellent |
| Cible 18-35 ans Abidjan | 7/10 | 8/10 | 10/10 |
| Cohérence avec un slogan "Sauvé pour Sauver" | Bonne | Très bonne (impact) | Très bonne (énergie) |

---

## 5. Mon arbitrage attendu

**Réponds-moi** par 1 des 4 options :

- `A` — On part sur Bento Sermon Spotlight (sûr, joli, pro).
- `B` — On part sur Editorial Photo-First (premium, magazine, impact).
- `C` — On part sur Brutalist Gen Z (radical, instagrammable, clivant).
- `mix` — Tu mélanges X et Y (précise quels éléments).
- `D` — Une 4e direction que tu décris.

**Tant que tu n'as pas répondu, je ne touche à aucune ligne de code.**

Une fois choisi, je passe à l'étape 4 (implémentation) en respectant les garde-fous (admin intact, palette dupliquée sous `theme.colors.public.*`, pas de Lorem ipsum, build < 200 KB gzip, accessibilité AA).
