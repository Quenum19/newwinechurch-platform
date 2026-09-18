# Prompt à copier dans Claude Design

Envoie ce prompt tel quel dans une nouvelle conversation Claude Design, puis attache le zip du dossier `docs/design_handoff_bal_slides_v2/`.

---

## Prompt

> Tu es un **directeur artistique senior** spécialisé dans les shows visuels d'événements de prestige : galas royaux, remises de prix cinématographiques (Cannes, Oscars), défilés de haute couture. On te confie **17 slides** qui rythment le grand bal officiel de la **New Wine Church** — événement gala de 200 invités, thème **« A Dark Night in Elegance »**, le vendredi 24 juillet 2026.
>
> L'écran fullscreen 1920×1080 est le **cœur visuel** de la soirée. Actuellement les slides sont correctes mais **plates** — je veux les transformer en un **show cinématique coordonné**, digne d'une cérémonie de standing international.
>
> ### Ce que je veux
>
> 1. **Améliorer chaque slide** pour aller vers un rendu **royal, dramatique, mémorable** :
>    - Profondeur 3D via CSS transforms (perspective, rotateY, translateZ) — pas de WebGL
>    - Motion typography sur tous les titres (les mots grandissent, morphent, respirent)
>    - Particules or dynamiques adaptées au moment (chandelles pour arrivée, feux d'artifice pour proclamation, spotlights pour défilé)
>    - Effets d'entrée avec **anticipation** : chaque slide a un pré-état de suspense, un état plein, un pré-transition
>    - Cinématique : les caméras virtuelles se déplacent (parallax, zoom in, tilt)
>
> 2. **Coordination inter-slides** — les transitions entre slides doivent former un **show narratif**. Fournir un fichier `TRANSITIONS.md` qui décrit chaque enchaînement (ex : de VoteSlide → ProclamationSlide = fade au noir + flash or + reveal explosif). Le régisseur bascule d'une slide à l'autre : le passage doit être **spectaculaire**, pas un cut sec.
>
> 3. **Cohérence thématique absolue** — respecte STRICTEMENT la charte (voir `PALETTE.md`) :
>    - Couleurs : noir profond, or métallique, ivoire chaud, bordeaux (aucune autre couleur)
>    - Polices : Anton (titres), Cinzel (classique), Great Vibes (script), Playfair, Cormorant
>    - Ornements : losanges or aux coins, double filet or, étoiles ★, séparateurs ✦ ◆
>
> 4. **Innover** en respectant la contrainte technique :
>    - Stack cible : React 19 + Framer Motion (transitions déclaratives)
>    - Rendu 60fps sur laptop moderne
>    - Chaque slide reçoit une prop `state` avec la même signature qu'aujourd'hui (voir `slides-code/*.jsx`)
>    - Pas de dépendance runtime externe
>
> 5. **Utiliser des ressources externes** intelligemment :
>    - SVG animés inline (base64) pour éléments décoratifs (couronnes, chandeliers, blasons)
>    - Lottie possible si léger (< 100kb par slide)
>    - Images uniquement pour le fond de certaines slides (via `state.event.cover_image` déjà en place)
>
> ### Livrables attendus
>
> Pour **chaque slide** de `SLIDES_INVENTORY.md`, une version `.dc.html` autonome :
> - Nom : `<NomSlide>V2.dc.html` (ex : `ArriveeSlideV2.dc.html`)
> - Design Component (comme dans `docs/design_handoff_dark_night/`)
> - Le composant doit accepter la prop `state` avec la structure d'origine
> - Chaque slide fait 1920×1080, ratio 16:9, prête pour F11
>
> Plus un fichier `TRANSITIONS.md` qui décrit les 17 → 17 enchaînements (matrice ou séquence).
>
> Plus un fichier `RESSOURCES_EXTERNES.md` qui liste tous les SVG/Lottie/images utilisés, avec leur usage par slide et leur URL/base64.
>
> ### Contraintes non-négociables
>
> - ✅ Toute animation 60fps
> - ✅ Charte respectée (couleurs + fonts uniquement de PALETTE.md)
> - ✅ Chaque slide reste **fonctionnelle** (les données du `state` toujours affichées : nom du dernier arrivé, compteur de votes, candidats, etc.)
> - ✅ Compatibilité écran unique 1920×1080 (pas de responsive)
> - ❌ Pas de son (l'audio du bal vient d'ailleurs)
> - ❌ Pas de vidéo lourde (< 30fps ok si vraiment nécessaire, mais éviter)
> - ❌ Pas de dépendance qui ferait planter React 19
>
> ### Références visuelles
>
> Voir `REFERENCES.md` pour des inspirations (Awwwards, CodePen, Framer templates gala, tapis rouge Cannes, remise Oscars, défilés Dior).
>
> ### Contexte émotionnel par phase du programme
>
> 1. **Arrivée & pré-show** (18h-20h30) — Anticipation, curiosité, glamour des arrivées
> 2. **Grands moments** (20h30-2h) — Éclat maximal, moments dramatiques, énergie
> 3. **Vote Roi & Reine** — Suspense, glamour couronne
> 4. **Proclamation** — Climax, révélation, apothéose royale
> 5. **Ouverture du bal** — Explosion joyeuse, mouvement
> 6. **Fin (Merci)** — Douce clôture, gratitude, promesse retour
>
> ### Vérification finale avant de livrer
>
> Pour chaque slide, tu dois pouvoir répondre :
> - Quelle émotion je crée ?
> - Comment on entre dans cette slide ?
> - Que se passe-t-il quand on y reste ?
> - Comment on sort ?
> - Qu'est-ce qui la rend **inoubliable** ?
>
> Prends le temps. Ce bal se prépare depuis des mois — la production visuelle doit être à la hauteur.

---

## Instructions post-livraison Claude Design

Une fois les 17 fichiers `.dc.html` reçus :

1. Télécharge le zip depuis Claude Design
2. Envoie-moi le zip via le chat de code (ou dis-moi où le déposer)
3. Je réintégrerai chaque slide dans `frontend/src/pages/live/slides/` en adaptant le JSX pour React
4. Test sur `/live/bal/3` — validation avant push
