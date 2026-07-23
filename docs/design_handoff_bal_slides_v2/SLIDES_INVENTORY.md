# Inventaire des 17 slides — État actuel et opportunités

Chaque slide dans l'ordre du programme du bal. Le code source est dans `slides-code/`.

**Légende** : ⚠ = point faible identifié · ✨ = opportunité d'amélioration

---

## Phase 1 — Avant l'événement / Attente

### 1. `DefaultSlide` — Affiche d'attente
- **Rôle** : slide d'attente / fallback avant le début officiel
- **Visuels** : `state.event.cover_image` en `contain` centré + particules or + logo NWC + tag "BAL 2026"
- **Animations** : aucune, juste GoldParticles count=25
- **Données** : `state.event.cover_image`, `state.event.title`
- **Polices** : Playfair Display
- ⚠ **Faiblesses** : totalement statique, aucune entrance motion. Le fond `contain` sur noir dur donne des grandes bandes noires. Pas de titre/héro.
- ✨ **Opportunité V2** : Ken Burns lent sur l'affiche, pulsation subtile de bienvenue, respiration or, apparition tag "L'événement commence bientôt" ou countdown élégant.

---

## Phase 2 — Arrivée & Pré-show (18h00-20h30)

### 2. `ArriveeSlide` — Compteur d'arrivées LIVE
- **Rôle** : feedback communautaire "on te voit arriver"
- **Visuels** : affiche floutée en fond, compteur XXL Anton `22vw`, pastille "DERNIER ARRIVÉ" pill, phrase italique tournante 4 messages / 5s
- **Animations** : compteur `spring(200,15)` sur key change, latest arrivé `opacity+scale` pulse, carrousel messages fade+y 0.8s
- **Données** : `state.stats.arrivees_count`, `state.stats.latest_arrival`, `state.stats.total_expected`, `state.event.cover_image`
- **Polices** : Anton, Playfair italique
- ⚠ **Faiblesses** : flash "dernier arrivé" timide (scale 1.05, pas de glow burst) ; pas de queue si arrivées rapprochées ; compteur saute d'entier à entier (pas de count-up fluide) ; affiche floue traitée comme un vulgaire gris
- ✨ **Opportunité V2** : count-up numeric fluide + burst or radial à chaque arrivée, queue de 3 derniers arrivés en carousel vertical avec photos si dispo, projecteur balayant sur le nom, pulsation heart-beat sur le compteur, ratio de remplissage en anneau progressif

### 3. `MurStarsSlide` — Photo & tag #BalNWC2026
- **Rôle** : moment cocktail/photo, incite au partage social
- **Visuels** : titre "★ MUR DES STARS ★" gradient or text-clip, étoile qui tourne en fond (linear 40s), sous-titre "Prends ta photo", compteur "N STARS PRÉSENTES" en bas
- **Animations** : étoile fond rotate 0→360° infini, titre scale 0.9→1
- **Données** : `state.stats.arrivees_count`
- **Polices** : Anton, Playfair, Geist Mono
- ⚠ **Faiblesses** : une seule étoile qui tourne = pauvre pour un "mur de stars" (pas de mosaïque, pas de wall of names/avatars). Aucun QR code ni CTA pour partager. Pas d'aperçu des photos taguées.
- ✨ **Opportunité V2** : vraie mosaïque de "stars" (avatars circulaires des arrivés en pluie), QR animé pour poster, ticker Instagram/TikTok avec photos scrapées #BalNWC2026, spots de projecteurs 3D

### 4. `InstallationSlide` — Rejoignez la salle
- **Rôle** : transition cocktail → prise de place, teaser prochaines étapes
- **Visuels** : titre "★ REJOIGNEZ LA SALLE ★" Anton, grille 4 colonnes avec 4 étapes
- **Animations** : cards stagger delay 0.6 + i*0.15
- **Données** : aucune, `NEXT_STEPS` hardcodé en JS
- **Polices** : Anton, Playfair, Geist Mono
- ⚠ **Faiblesses** : horaires en dur (`19:30`, `19:45`…) qui ne matchent pas `ProgrammeSlide` (18h/20h). Cards sans pulse/hover. Pas de countdown. Zero indication visuelle du "prends ta place".
- ✨ **Opportunité V2** : silhouettes 3D d'invités qui rejoignent une salle (parallax), countdown vers la première étape, cards qui pulsent avec l'étape imminente

---

## Phase 3 — Grands moments dîner (20h30-23h30)

### 5. `DancingStarsSlide` — Rideau demoiselles d'honneur
- **Rôle** : rideau de scène avant les demoiselles d'honneur
- **Visuels** : bandes verticales dorées (`repeating-linear-gradient`), reflet balayant, vignette, titre 2 lignes "DANCING / STARS"
- **Animations** : reflet x['-100%','100%'] linear 6s, textShadow pulse 2s
- **Polices** : Anton (mega), Playfair italique
- ⚠ **Faiblesses** : le "rideau" est un gradient CSS répété = plat, pas de plis 3D ni de mouvement d'ondulation (le nom promet plus). Pas de particules ici. Aucune image des candidat·e·s "Dancing Stars".
- ✨ **Opportunité V2** : vrai rideau 3D avec plis animés (CSS 3D transforms), ondulation de la matière, spots de projecteurs qui traversent, aperçu des candidat·e·s en mode "ombres" avant reveal

### 6. `BienvenueSlide` — Mots d'accueil officiels
- **Rôle** : mots d'accueil au public assis
- **Visuels** : tag "Bienvenue à", titre italique géant = `state.event.title`, séparateur or `scaleX`, message 3 lignes, étoile finale
- **Animations** : cascade de fades (delays 0→0.2→0.8→1→1.6), séparateur scaleX 0→1, aucun loop
- **Données** : `state.event.title`
- **Polices** : Playfair italique (100%)
- ⚠ **Faiblesses** : entièrement statique après 2s (la slide "meurt" pendant le discours). Aucun ancrage pasteur/orateur (nom, photo). Cinq animations enchaînées puis rien.
- ✨ **Opportunité V2** : halo doré qui respire en boucle, particules de champagne dorées permanentes, orateur en médaillon avec nom/titre, background parallax subtil (chandelier lentement)

### 7. `ProgrammeSlide` — Déroulé complet
- **Rôle** : affiche du programme complet (12 étapes)
- **Visuels** : header "Programme de la soirée" + titre + grille 2 colonnes × 6 lignes
- **Animations** : header fade 1s, grille entière fade delay 0.5 (**pas de stagger sur les lignes**)
- **Données** : `state.event.title`, `PROGRAM` (12 items) hardcodé
- **Polices** : Playfair Display
- ⚠ **Faiblesses** : programme hardcodé (dérive terrain). Pas d'indicateur "on est ici" (highlight étape courante selon slideKey). Grille arrive d'un bloc, gâche l'effet "sommaire de gala". Aucun scroll ni pagination.
- ✨ **Opportunité V2** : stagger sur chaque ligne (0.05s), highlight de l'étape en cours (glow or + underline animé), séparateur ornemental entre horaires clé, effet livre ancien avec pages

### 8. `BonAppetitSlide` — Service du repas
- **Rôle** : ouverture du service, annonce menu
- **Visuels** : tagline "Que le repas soit servi" letterspacing anim, titre "Bon appétit" italique, ligne menu "Tchêpe · Attiéké poulet"
- **Animations** : tagline letterSpacing 0.1em→0.4em 1.5s, titre fade+y 1.2s
- **Polices** : Playfair Display (unique slide sans Anton/mono)
- ⚠ **Faiblesses** : très minimal, no imagerie du plat, no icône couverts, aucune boucle. Menu non-configurable. Sur écran géant 30+ min de dîner → risque écran zombie.
- ✨ **Opportunité V2** : illustrations SVG de plats du menu qui apparaissent avec fumée or animée, quote du chef qui tourne, "coming next" teaser du programme, boucle de particules dorées de style paillettes de champagne

### 9. `VoteSlide` — Scrutin Roi & Reine
- **Rôle** : ouverture du scrutin Roi & Reine
- **Visuels** : split 2 colonnes — gauche : titre "Roi & Reine 2026" + carrousel candidats + card compteur votes ; droite : QR SVG 340px
- **Animations** : carrousel AnimatePresence fade+x, rotation 3.5s ; QR scale pulse 3%
- **Données** : `state.event.id`, `state.candidates[]`, `state.stats.votes_count`, `state.stats.total_expected`
- **Polices** : Anton, Playfair
- ⚠ **Faiblesses** : pas de barre de progression votes/attendus (juste texte). Carrousel expose UN candidat à la fois → mauvais pour comparaison. QR statique. Aucune animation "vote reçu" (flash quand `votes_count` incrémente).
- ✨ **Opportunité V2** : mosaïque complète des candidats à gauche + compteur votes par candidat en temps réel (mini-bar or), animation ripple sur QR à chaque vote reçu, halo "scanne-moi" flèche animée, count-up fluide sur compteur

---

## Phase 4 — Défilé & prestations (23h30-2h00)

### 10. `DefileSlide` — Intro défilé red carpet
- **Rôle** : intro défilé mode, atmosphère red carpet
- **Visuels** : halo projecteur central + 2 rayons latéraux, tagline "Place à l'élégance", titre "DÉFILÉ" bordé d'étoiles
- **Animations** : halo central opacity 0.5→0.9→0.5 4s, rayons pulse decalés
- **Polices** : Anton/Playfair fallback
- ⚠ **Faiblesses** : 3 projecteurs = ellipses statiques (opacity only), pas de balayage angulaire vrai. Pas de podium/silhouette. Titre "DÉFILÉ" statique après entrée. Aucune liste des mannequins.
- ✨ **Opportunité V2** : vrais projecteurs 3D avec faisceaux qui balaient l'espace en cinéma, podium en perspective, silhouettes qui défilent en ombres chinoises, tapis rouge qui se déroule

### 11. `RappeursSlide` — Annonce prestation rap
- **Rôle** : annonce chaque prestation rap live (headliner)
- **Visuels** : nom en majuscules XXL auto-scale, spotlight balayant rotate 15°, halo bordeaux pulsé, ligne dorée, ligne d'emojis 🎤🔥🎤
- **Animations** : spotlight x -40vw→40vw 6s, halo pulse, nom scale 0.7→1
- **Données** : `state.config.artiste` (string)
- **Polices** : Anton, Playfair italique
- ⚠ **Faiblesses** : ❌ **emojis 🎤🔥 cassent le style luxe** (rendu inégal cross-OS, pixellisé sur grand écran). Pas de photo/portrait. Aucun teaser de titre/track.
- ✨ **Opportunité V2** : SVG micro custom or, silhouette artiste en néon, letter-by-letter reveal du nom style Cannes, waveform audio décoratif, background gradient qui change selon "chaud/froid" du morceau

### 12. `DjSlide` — Transition dancefloor
- **Rôle** : transition musicale dancefloor
- **Visuels** : tagline "Place à la musique", titre "DJ" en 28vw, égaliseur 9 barres or→bordeaux
- **Animations** : titre fade+y, chaque barre égaliseur height['30%','100%','50%','90%','30%'] durations pseudo-random
- **Polices** : Anton, Playfair italique
- ⚠ **Faiblesses** : nom du DJ non exposé (contrairement à RappeursSlide). Égaliseur CSS statique, aucun lien avec son réel. Pas de lumière strobo ni gradient couleur qui change.
- ✨ **Opportunité V2** : ajouter `state.config.dj_name` exposé, platine 3D + vinyle qui tourne, lumières stroboscopiques or/bordeaux, égaliseur qui swap couleur au tempo, casque en overlay

---

## Phase 5 — Climax : Proclamation Roi & Reine (~2h20)

### 13. `ProclamationSlide` — LA slide climax
- **Rôle** : révélation Roi puis Reine en 6 phases orchestrées (SUSPENSE → INTERLUDE_1 → REVEAL_ROI → INTERLUDE_2 → REVEAL_REINE → DUO)
- **Visuels** : couronne 👑 XXL, cartes photo rondes 320px, barre progression votes 0→100%, count-up votes synchronisé, 24 confettis dorés
- **Animations** : machine à états complète, phases 5s+2s+7s+2.5s+7s+persist, `raf` pour progression 60fps
- **Données** : `state.results.roi{...}`, `state.results.reine{...}`
- **Polices** : Anton, Playfair
- ⚠ **Faiblesses** : **la plus riche mais** : la couronne = emoji 👑 (pixels sur écran géant), pas d'SVG custom or brossé. Confettis linéaires y sans sway/wobble. Aucun son/drumroll. Photos en border-radius:50% uniquement — pas de cadre couronne/laurier. `progress` géré via raf + setState (coûteux).
- ✨ **Opportunité V2** : **SVG couronne royale custom brossé or animée** (facettes qui scintillent), confettis avec `wobble+sway` réaliste + rotations 3D, cadre laurier or autour des photos, effet drumroll visuel (barres verticales qui accélèrent), flash blanc au reveal, moment "envelope opening" style Oscars

---

## Phase 6 — Ouverture officielle & fin

### 14. `OuvertureBalSlide` — Coup d'envoi
- **Rôle** : ouverture officielle post-couronnement
- **Visuels** : tagline "C'est parti", titre "OUVERTURE OFFICIELLE" + sous-titre "du Bal", trois étoiles
- **Animations** : titre scale 0.5→1, cascades delays 1.2/1.8. **Aucun loop.**
- **Polices** : Playfair Display
- ⚠ **Faiblesses** : très fort au launch puis mort. Aucun compte à rebours "3-2-1", aucun flash, aucun fireworks. Style identique à BienvenueSlide → sensation "déjà vu".
- ✨ **Opportunité V2** : countdown 3-2-1 avec chiffres qui explosent, feux d'artifice or/bordeaux plein écran, portes qui s'ouvrent (perspective 3D), fumée or qui se dissipe, musique visuelle (waveform)

### 15. `PhotosAmbianceSlide` — Diaporama photos brandées
- **Rôle** : diaporama plein écran des photos brandées
- **Visuels** : image cover en fondu + Ken-Burns léger (scale 1.05→0.98), state vide = titre Anton
- **Animations** : AnimatePresence toggle 6s, opacity + scale 1.6s easeInOut
- **Données** : `state.photos[]`
- **Polices** : Anton, Playfair italique
- ⚠ **Faiblesses** : aucun overlay (hashtag, nom du photographe, timestamp) — les cadres 16:9 sont pré-générés côté backend mais rien ne l'atteste sur le live. Pas de compteur "photo n/N". Rotation strictement séquentielle (pas de shuffle).
- ✨ **Opportunité V2** : polaroid ken burns avec ombre, photos qui glissent en pile, transitions vintage film burn, mini compteur discret, overlay #BalNWC2026 subtil, effet flash appareil photo entre transitions

### 16. `FinSlide` — Merci pour cette soirée
- **Rôle** : clôture, remerciements + best-of photos
- **Visuels** : photo fond assombrie brightness 0.4 rotation 4.5s, titre italique "Merci pour cette / soirée inoubliable", trois étoiles
- **Animations** : photo fond scale 1.05→1 1.5s, titre fade+y 1.5s
- **Données** : `state.photos[]`
- **Polices** : Playfair italique
- ⚠ **Faiblesses** : pas de crédits (organisateurs, sponsors, pasteur, staff). Aucun rappel de la date du prochain événement. Best-of = même liste que PhotosAmbianceSlide (pas de curation). Manque une slow reveal des chiffres clés.
- ✨ **Opportunité V2** : générique de fin cinéma avec crédits qui remontent, chiffres clés animés (X arrivées, Y votes, Roi & Reine récap), rappel prochain event, moment "au revoir" avec particules qui s'éteignent une par une

### 17. `NoirSlide` — Écran noir de bascule
- **Rôle** : écran 100% noir pour laisser passer vidéos/live via HDMI
- **Visuels** : `<div>` noir plein écran
- **Animations** : aucune
- ⚠ **Faiblesses** : bascule brutale
- ✨ **Opportunité V2** : fade-in 400ms via `motion.div` pour bascule scénique propre

---

## Observations transverses pour le designer

### Palette dominante
`#0A0A0A` (noir), `#1a0f14` (bordeaux profond), `#C9A961` (or principal), `#F5E6C8` (ivoire), avec accents `#FFE9A8` / `#FFF6D8` / `#7E662E` / `#8B1A2F` / `#B08A3F`. Très cohérent — mono-tonalité. **Aucune slide n'ose un pic contrasté (blanc pur, bleu nuit) pour rythmer.**

### Typographie utilisée
Trio : **Anton** (titres XXL), **Playfair Display** (italique + serif), **Geist Mono** (compteurs discrets). ❌ **Cinzel jamais utilisée** malgré l'ambiance royale attendue — grosse opportunité sur ProclamationSlide notamment.

### Composant partagé
`GoldParticles` (import universel sauf NoirSlide, DancingStarsSlide) — seul "background alive", décoratif pas structurant.

### Transitions inter-slides
**Absentes**. Aucune slide n'expose de `exit` propre (sauf AnimatePresence internes). **Grosse opportunité** : crossfade / wipe or / rideau de scène.

### Effets 3D / perspective
**Zéro**. Tout est en 2D + gradient + text-shadow. `transform: perspective()` ou WebGL sur les slides climax (Proclamation, Ouverture, Dancing, Défilé) ajouterait l'ampleur cinéma manquante.

### Sons
Aucune synchro audio. **Critique pour Proclamation** (drumroll, sting, applaudissements).

### Hardcoding
`InstallationSlide.NEXT_STEPS`, `ProgrammeSlide.PROGRAM`, `BonAppetitSlide` menu, `ArriveeSlide.MESSAGES` — tous en constantes JS, non pilotables depuis l'admin backend. À exposer via `state.config` ou nouvelle table `bal_program`.

### Emojis
🎤🔥 (RappeursSlide), 👑 (ProclamationSlide/VoteSlide fallback) — **cassent le brand luxe**. À remplacer par SVG custom.

### Répétition stylistique
`BienvenueSlide`, `OuvertureBalSlide`, `FinSlide` partagent la même recette (Playfair italique + or/ivoire + fade+y + étoiles) — **risque de "toutes se ressemblent"** côté public. Différencier fortement.

---

## Ce que Claude Design doit garder / changer

### À garder impérativement
- La structure "1 slide = 1 composant standalone"
- La prop `state` avec sa signature (voir slides-code/*.jsx)
- Le mécanisme de bascule via `slideKey` (contrôlé par régie, pas par slide elle-même)
- La palette couleurs/fonts
- L'utilisation du composant `GoldParticles` (peut évoluer mais garder l'API)

### À changer / améliorer
- Ajouter des `exit` motion partout pour transitions scéniques
- Introduire de la profondeur 3D via CSS transforms
- Remplacer 100% des emojis par SVG custom
- Ajouter du motion permanent (boucles) sur les slides "discours" (Bienvenue, Ouverture, Fin) pour éviter les moments zombies
- Coordonner les slides critiques Vote → Proclamation → Ouverture en un show
