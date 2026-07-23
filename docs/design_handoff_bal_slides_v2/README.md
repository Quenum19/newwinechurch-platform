# Handoff — Écran live du bal « A Dark Night in Elegance »

## Contexte

Le bal officiel de la **New Wine Church** aura lieu **le vendredi 24 juillet 2026** à **La Maison de la Destinée (Riviera Bonoumin, Rue 65, Abidjan)**. Environ **200 invités attendus**. C'est un gala de prestige : *bal & dine*, code vestimentaire strict, ambiance royale nocturne.

Un **écran fullscreen 1920×1080** est installé dans la salle, contrôlé par une **régie tablette**. Il affiche 17 slides qui rythment la soirée — de l'accueil à la clôture. Chaque slide correspond à un moment précis du programme.

**Objectif de ce handoff** : transformer ces 17 slides d'un rendu correct → un rendu **cinématique, royal, mémorable**, digne d'un événement présidentiel ou d'une remise de prix cinématographique.

## Stack technique (contrainte)

- **React 19** + **Vite 8**
- **Framer Motion** pour toutes les animations
- Composants JSX standalone (aucun state global, chaque slide reçoit `state` en prop)
- Rendu fullscreen, F11 sur Chrome (compatible plein écran sans bordures)
- CPU/GPU : le poste dédié est un PC portable moderne — animations 60fps requises

## Charte visuelle (obligatoire — ne pas dévier)

**Palette** *(voir PALETTE.md pour les hex exacts)*
- **Noir profond** #0A0A0A (fond dominant)
- **Or métallique** #C9A961, #E6C877, #EECF80 (titres, ornements, particules)
- **Ivoire chaud** #F5E6C8, #F0E6CF (corps de texte, contrastes)
- **Bordeaux** #8B1A2F, #6b1523 (accents, bloc rappels)

**Polices** *(Google Fonts, déjà chargées globalement dans BalLiveScreen.jsx)*
- **Anton** — Titres puissants (nom event, chiffres, cries visuels)
- **Cinzel** — Sous-titres classiques, dates, noms de rôle
- **Great Vibes** — Mots signature manuscrits (« Elegance », « Suis-nous »)
- **Playfair Display** — Corps italique élégant, sous-titres poétiques
- **Cormorant Garamond** — Long-format lisible

**Ornements récurrents** *(déjà utilisés sur le cadre photo — voir docs/design_handoff_dark_night/)*
- Losanges or 14×14px `rotate(45deg)` aux 4 coins
- Filets or doubles (inset 22px puis 30px) façon cadre présidentiel
- Étoile ★ (U+2605) 82-160px avec glow or
- Séparateur diamant ◆ (U+25C6) ou ✦ (U+2726)
- Filets fins « — IN — » entre lignes

## Ce que le designer doit livrer

Pour chaque slide de `SLIDES_INVENTORY.md` :
1. Une **version .dc.html standalone** (comme dans docs/design_handoff_dark_night/)
2. Le composant doit accepter en prop un objet `state` avec la même signature qu'aujourd'hui (voir `slides-code/*.jsx`)
3. Doit être **prêt à réintégrer dans React** — pas de dépendance runtime externe (les fonts sont chargées ailleurs)

## Ambitions non-négociables

- **Coordination inter-slides** : les transitions entre slides doivent former un show (voir `AMBITION_V2.md`)
- **Profondeur 3D** : utiliser CSS 3D transforms (perspective, rotateY, translateZ) pour créer de la profondeur — sans WebGL
- **Particules dynamiques** : chaque slide a des particules or animées (déjà `GoldParticles.jsx`, à améliorer/varier par slide)
- **Anticipation** : chaque slide doit avoir un pré-état (fade-in avec suspense), un état plein (animation continue), et un pré-transition
- **Motion typography** : les titres grandissent, morphent, respirent — jamais complètement statiques
- **Compatibilité DomPDF impossible** — c'est du rendu écran, pas d'impression

## Livrables attendus

- 17 fichiers `.dc.html` (un par slide)
- Un fichier `TRANSITIONS.md` décrivant le rythme entre chaque slide (ex : slide DJ → slide DancingStars = wipe latéral or)
- Éventuellement des SVG/Lottie inline (encodés base64 dans les .dc.html)

## Fichiers de ce package

| Fichier | Contenu |
|---|---|
| `README.md` | Ce fichier |
| `PALETTE.md` | Design tokens exacts (couleurs, fonts, ornements) |
| `SLIDES_INVENTORY.md` | Les 17 slides détaillées + code source actuel |
| `AMBITION_V2.md` | Prompt à envoyer à Claude Design |
| `REFERENCES.md` | Inspirations + bibliothèques externes |
| `slides-code/` | Code source .jsx actuel de chaque slide |
| `SCREENSHOTS/` | *(optionnel — à générer localement)* Captures 1920×1080 des slides actuelles |
