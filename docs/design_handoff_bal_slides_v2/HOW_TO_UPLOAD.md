# Comment envoyer ce package à Claude Design

## Étape 1 — Créer le zip

En local (Windows PowerShell) :

```powershell
cd c:\wamp64\www\newwinechurch\docs
Compress-Archive -Path .\design_handoff_bal_slides_v2\* -DestinationPath .\design_handoff_bal_slides_v2.zip -Force
```

Ou depuis Git Bash / WSL :

```bash
cd /c/wamp64/www/newwinechurch/docs
zip -r design_handoff_bal_slides_v2.zip design_handoff_bal_slides_v2/
```

## Étape 2 — Ouvrir Claude Design

- Va sur https://claude.ai/design
- **Nouvelle conversation** (pas dans un projet existant)

## Étape 3 — Message à envoyer

Copie exactement ce texte comme premier message :

```
Salut ! Je te confie 17 slides Framer Motion pour l'écran live du grand bal officiel de la New Wine Church — "A Dark Night in Elegance", 24 juillet 2026, gala de 200 invités.

Le brief complet est dans le zip attaché. Ouvre :
1. README.md — contexte + stack technique
2. PALETTE.md — design tokens exacts (à respecter absolument)
3. SLIDES_INVENTORY.md — les 17 slides détaillées avec faiblesses et opportunités
4. AMBITION_V2.md — mon prompt de mission complet
5. REFERENCES.md — inspirations et bibliothèques externes
6. slides-code/ — code source actuel de chaque slide

Je veux une V2 cinématique, royale, coordonnée entre slides comme un show. Livre 17 fichiers .dc.html standalone + un TRANSITIONS.md décrivant les enchaînements. Toutes les contraintes techniques et thématiques sont dans AMBITION_V2.md.

Prends ton temps. Ce bal se prépare depuis des mois — la production visuelle doit être à la hauteur.
```

Puis **attache le zip** `design_handoff_bal_slides_v2.zip`.

## Étape 4 — Attendre la livraison

Claude Design va probablement :
1. Poser 2-3 questions de clarification (accepte, réponds)
2. Livrer par vagues (peut-être 3-4 slides à la fois si économie de tokens)
3. Produire les fichiers `.dc.html`

**Tu peux :**
- Demander à voir chaque slide en preview interactif dans Claude Design
- Itérer : « la ProclamationSlide manque de suspense, refais avec plus de drumroll visuel »
- Demander à ce que tel élément soit remplacé (ex : couronne SVG au lieu d'emoji 👑)

## Étape 5 — Rapatrier les livrables

Une fois satisfaisant :
1. Télécharge le zip depuis Claude Design
2. Dépose-le dans `docs/design_handoff_bal_slides_v2/output/` de ton repo
3. Dis-moi : « Claude Design a livré, réintègre les slides V2 dans le code »
4. Je convertis chaque `.dc.html` → composant React JSX
5. Je remplace `frontend/src/pages/live/slides/XXXSlide.jsx` par la V2
6. Test sur `/live/bal/3` en local avant push

## Astuces pour Claude Design

- Il aime les briefs longs et structurés — le nôtre est bon
- Il excelle sur les fichiers `.dc.html` (design components autonomes) — c'est son format
- Il utilise Tailwind ou inline styles — pas de dépendance externe
- Pour les SVG custom, il peut générer directement inline
- Pour Lottie, il peut te suggérer des JSON de LottieFiles à embarquer

## Si Claude Design refuse un élément

Si tu vois « je ne peux pas générer cet effet 3D avec CSS transforms », insiste :
> « Utilise `perspective(1200px)` et `transform-style: preserve-3d` sur le parent, puis `rotateY` + `translateZ` sur les enfants. C'est du CSS 3D natif, pas WebGL. »

Si tu veux du son mais qu'il refuse pour raisons d'accessibilité, laisse tomber — de toute façon la salle a un système audio séparé.
