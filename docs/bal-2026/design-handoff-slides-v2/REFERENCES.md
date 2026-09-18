# Références visuelles & bibliothèques externes

## 🎬 Inspirations à mimer

### Cérémonies & Galas
- **Cannes Film Festival intro** — https://www.youtube.com/watch?v=… (motion typography or, particules, transitions cinématiques)
- **Oscars nomination reveal** — Grande révélation avec typographie qui explose depuis un point central
- **Cannes red carpet livestream** — Compteurs élégants, tickers dorés en bas d'écran
- **BAFTA opening titles** — Typo Cinzel-like animée avec ornements

### Défilés & Haute Couture
- **Dior show intro sequence** — Cadres or classiques, parallax de portraits, respiration lente
- **Chanel opening** — Symétrie parfaite, ors, minimalisme royal
- **Victoria's Secret Fashion Show intro** — Diamants qui apparaissent, glow persistant

### Motion Design de référence
- **Awwwards Site of the Day** (catégorie luxury/hotel) — Layouts sombres avec typo dorée, transitions Framer Motion
- **Codrops "Elegance in Motion"** — Compilations de démos motion typography élégante
- **Frontend Masters "Advanced Framer Motion"** — Cours de référence pour transitions coordonnées

## 🧰 Bibliothèques externes utilisables

### Framer Motion (déjà installé)
- `motion` + `AnimatePresence` — animations déclaratives
- `useSpring`, `useTransform`, `useMotionValue` — motion values fluides
- `motion.div` avec `initial/animate/exit` + `transition` custom
- `useCycle` pour boucles d'états
- `LayoutGroup` pour transitions coordonnées entre slides

### CSS 3D transforms (natif)
```css
perspective: 1200px;
transform-style: preserve-3d;
transform: perspective(1000px) rotateY(15deg) translateZ(50px);
```

### SVG animés inline
- Étoiles qui scintillent (SMIL ou CSS keyframes)
- Filets or qui se dessinent (`stroke-dasharray` + `stroke-dashoffset` animés)
- Couronnes SVG stylisées (à créer, encoder en base64)

### Lottie (à valider — poids ≤ 100kb par slide)
- LottieFiles.com — chercher "gold particles", "confetti gold", "crown reveal"
- Player Lottie React : `lottie-react` (n'est pas encore installé — à valider avant usage)

### Web Fonts (déjà chargées)
- Google Fonts : Anton, Cinzel, Great Vibes, Playfair Display, Cormorant Garamond
- Pas besoin d'ajouter d'autres polices — la charte est stricte

## 🖼️ Ressources d'images libres de droits

### Fonds & Ambiances
- **Unsplash — "dark elegance"** : https://unsplash.com/s/photos/dark-elegance
- **Unsplash — "gold texture"** : https://unsplash.com/s/photos/gold-texture (pour patterns de fond subtils)
- **Unsplash — "gala event"** : https://unsplash.com/s/photos/gala-event
- **Pexels — "chandelier"** : https://www.pexels.com/search/chandelier/ (fond salle bal)
- **Pexels — "red carpet"** : https://www.pexels.com/search/red-carpet/

### Textures & Overlays
- **Freepik gold texture PSD** — pour halos or (à convertir en PNG transparent)
- **Subtle Patterns** — https://www.toptal.com/designers/subtlepatterns/ (patterns dark subtils)

### Icônes / Ornements
- **Iconify — "crown"** : https://iconify.design/search/?query=crown (SVG couronne royale)
- **Iconify — "star"** : SVG étoiles variées
- **Iconify — "flourish"** : ornements Baroque
- **Lucide-react** (déjà installé) — pour icônes UI simples

## 🎨 Palettes complémentaires (dans le respect de la charte)

Si Claude Design veut nuancer sans sortir de la palette :

### Nuances or (dégradés)
- Or profond → or clair : `linear-gradient(180deg, #FFE9A8 0%, #C9A961 50%, #7E662E 100%)`
- Or → cuivre : `linear-gradient(135deg, #EECF80 0%, #C9A961 50%, #8B6D3A 100%)`

### Nuances bordeaux (badges)
- Bordeaux → rubis : `linear-gradient(180deg, #8a2531 0%, #5f1720 100%)`
- Bordeaux avec liseré or : `border: 1pt solid rgba(214,178,95,.7)` sur `#8B1A2F`

## 🎬 Transitions inter-slides suggérées

### Techniques élégantes
- **Fade cross-dissolve** avec courbes Bézier cinématiques `[0.16, 1, 0.3, 1]`
- **Wipe latéral or** — un filet or traverse l'écran de gauche à droite
- **Zoom in/out** avec parallax léger (scale 1.05 → 1.0)
- **Flash or** entre slides critiques (proclamation, ouverture bal)
- **Découverte par le centre** — les slides s'ouvrent depuis un point central (scale 0 → 1, radial reveal)

### Techniques à ÉVITER
- ❌ Slide horizontal brutal (cheap)
- ❌ Rotation 360° (ringard)
- ❌ Flip 3D si mal maîtrisé (glitchy)
- ❌ Bounce excessif (pas élégant)

## 📚 Livres & Cours pour inspiration

- « The Motion Design Manual » (Louis Ansa)
- « Designing Motion » (Kaan Yalcinkaya)
- Vidéos YouTube : « Kyle Kelley motion typography »
- Formation Motion Design School — Advanced Kinetic Typography

## 🌐 Sites live à observer

- **Apple Event pages** (comme WWDC intro) — motion typography haut de gamme
- **Awwwards.com — Site of the day** (chercher restaurants gastronomiques, hôtels de luxe)
- **Framer.com/showcase** — templates avec effets Framer Motion sophistiqués
- **CodePen — collection "elegant animation"** — https://codepen.io/collection/AKGabW

## Note pour Claude Design

Toutes ces références sont des **sources d'inspiration**, pas des copies à coller. Le résultat doit être **unique**, propre à New Wine Church, et cohérent avec le thème « A Dark Night in Elegance ». La qualité est prioritaire sur la quantité — mieux vaut 17 slides ambitieuses et cohérentes que des effets gadgets dispersés.
