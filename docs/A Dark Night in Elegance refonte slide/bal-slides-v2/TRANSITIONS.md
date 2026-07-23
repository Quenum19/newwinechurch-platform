# TRANSITIONS — « A Dark Night in Elegance »
## Enchaînements scéniques entre les 17 slides V2

Ce document décrit le **show** : comment chaque slide entre, vit, et sort, et
comment le régisseur enchaîne d'une slide à la suivante. Toutes les transitions
sont pensées pour Framer Motion (`AnimatePresence` + `initial/animate/exit`).

---

## 1. Grammaire commune (à implémenter côté React)

Chaque slide V2 est un composant plein écran. Enveloppe-les dans un
`<AnimatePresence mode="wait">` piloté par `slideKey` (la régie).

**Courbe cinématique de référence** : `ease = [0.16, 1, 0.3, 1]` (easeOutExpo doux).

**Variantes de base réutilisables :**

```js
// Fondu-zoom (transition par défaut, élégante, neutre)
const crossZoom = {
  initial: { opacity: 0, scale: 1.04 },
  animate: { opacity: 1, scale: 1,    transition: { duration: 0.9, ease: [0.16,1,0.3,1] } },
  exit:    { opacity: 0, scale: 0.985, transition: { duration: 0.6, ease: [0.16,1,0.3,1] } },
};

// Révélation par le centre (radial) — pour les moments forts
const radialReveal = {
  initial: { opacity: 0, clipPath: 'circle(0% at 50% 50%)' },
  animate: { opacity: 1, clipPath: 'circle(75% at 50% 50%)', transition: { duration: 1.1, ease: [0.16,1,0.3,1] } },
  exit:    { opacity: 0, transition: { duration: 0.5 } },
};

// Wipe latéral or — un filet doré traverse l'écran
// (superposer <motion.div> plein écran, gradient or, x: '-100%' -> '100%')
const goldWipe = {
  initial: { x: '-120%' }, animate: { x: '120%' },
  transition: { duration: 0.7, ease: [0.7,0,0.3,1] },
};

// Flash or (2 frames) — pour les climax
const goldFlash = {
  initial: { opacity: 0 }, animate: { opacity: [0, 0.85, 0] },
  transition: { duration: 0.5, times: [0, 0.1, 1] },
};

// Fondu au noir — vers/depuis NoirSlide
const toBlack = {
  initial: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.4 } },
};
```

> **Règle d'or** : la transition SORTIE d'une slide + ENTRÉE de la suivante ne
> dépassent jamais **1,4 s** cumulées. Le public ne doit jamais attendre.

---

## 2. Séquence narrative complète (ordre du programme)

| # | De → Vers | Transition | Intention |
|---|---|---|---|
| — | (boot) → **Default** | `radialReveal` | Le show s'ouvre depuis un point de lumière |
| 1 | **Default → Arrivée** | `crossZoom` | On passe de l'attente à la vie qui afflue |
| 2 | **Arrivée → MurStars** | `goldWipe` (L→R) | Un projecteur balaie et découvre le mur |
| 3 | **MurStars → Installation** | `crossZoom` | Apaisement, on invite à s'asseoir |
| 4 | **Installation → DancingStars** | **Rideau qui tombe** (voir §3a) | Le rideau de scène descend puis se lève |
| 5 | **DancingStars → Bienvenue** | Rideau se lève + `crossZoom` | La scène se révèle, halo qui respire |
| 6 | **Bienvenue → Programme** | `crossZoom` | Transition sobre, discours → sommaire |
| 7 | **Programme → BonAppetit** | `goldWipe` | Un filet or « tourne la page » vers le repas |
| 8 | **BonAppetit → Vote** | `crossZoom` + montée QR | On bascule du dîner au jeu, énergie ↑ |
| 9 | **Vote → Défilé** | `goldWipe` (L→R) rapide | Le tapis rouge se déroule |
| 10 | **Défilé → Rappeurs** | `crossZoom` + halo bordeaux entrant | Montée d'adrénaline, la scène chauffe |
| 11 | **Rappeurs → DJ** | **Wipe latéral or** + strobe | Bascule dancefloor, la lumière claque |
| 12 | **DJ → Proclamation** | **Fondu au noir → Flash or → `radialReveal`** (voir §3b) | LE climax. Suspense total puis apothéose |
| 13 | **Proclamation → OuvertureBal** | `goldFlash` puis `crossZoom` | On enchaîne l'euphorie du couronnement |
| 14 | **OuvertureBal → PhotosAmbiance** | `crossZoom` lent (1,2 s) | Retombée douce, on savoure |
| 15 | **PhotosAmbiance → (boucle)** | fondu interne 6 s | Diaporama autonome |
| 16 | **… → Fin** | Fondu au noir 0,6 s puis `crossZoom` | Générique de clôture |
| 17 | **NoirSlide** | `toBlack` (400 ms) | Bascule HDMI, à tout moment |

---

## 3. Transitions signature détaillées

### 3a. Rideau de scène (Installation → DancingStars → Bienvenue)
La `DancingStarsSlideV2` EST le rideau. Pour l'enchaînement :

1. **Descente** : au montage de DancingStars, animer les plis depuis `y: -1080` → `0`
   (stagger 0,03 s par pli, gauche→droite) — le rideau tombe et masque la slide précédente.
2. **Vie** : les plis ondulent (`nwFold`), les spots croisent, le titre respire.
3. **Levée** : à la sortie, animer les plis `y: 0` → `-1080` (stagger inverse) pour
   dévoiler `Bienvenue`, dont le halo est déjà en train de respirer dessous.

```js
// pli i
initial={{ y: -1080 }}
animate={{ y: 0 }}
exit={{ y: -1080 }}
transition={{ delay: i*0.03, duration: 0.9, ease: [0.7,0,0.3,1] }}
```

### 3b. Le climax : DJ → Proclamation (la plus importante)
Séquence orchestrée en **4 temps** (~3,5 s), la seule qui a le droit de durer :

1. **Fondu au noir** (0,5 s) — DJ `exit opacity→0`, un `<motion.div>` noir monte à `opacity 1`.
2. **Silence noir** (0,4 s) — écran quasi noir, un léger grondement visuel possible
   (barre or fine qui pulse au centre, `scaleX`).
3. **Flash or** (0,3 s) — `goldFlash` plein écran `#FFF6D8`.
4. **Reveal explosif** — `ProclamationSlideV2` entre en `radialReveal` ; en interne
   le flash `nwFlash` rejoue, la couronne SVG scintille, les confettis démarrent,
   les compteurs de votes font leur count-up, les barres se remplissent.

> Côté data : la Proclamation gère ses **6 phases** (SUSPENSE → INTERLUDE_1 →
> REVEAL_ROI → INTERLUDE_2 → REVEAL_REINE → DUO) via `state.phase`. La transition
> ci-dessus amène sur la phase SUSPENSE ; les phases internes sont pilotées ensuite
> par la régie (ou un timer) — voir la prop `state.phase` du composant.

### 3c. Wipe or (générique, réutilisable)
Un `<motion.div>` plein écran superposé, `background: linear-gradient(105deg,
transparent, rgba(230,200,119,.9), transparent)`, largeur 60 %, qui traverse en
0,7 s. La nouvelle slide est déjà montée dessous en `opacity 1` ; le wipe masque
juste la bascule.

---

## 4. Table de compatibilité (matrice régie)

Le régisseur peut sauter n'importe où (imprévus). Transition par défaut si le saut
n'est pas prévu ci-dessus : **`crossZoom`**. Cas particuliers :

- **Vers NoirSlide** depuis n'importe quelle slide → toujours `toBlack` (400 ms).
- **Depuis NoirSlide** vers n'importe quelle slide → `radialReveal` (on rallume).
- **Retour arrière** (ex. re-montrer Programme) → `crossZoom`, jamais de wipe
  (le wipe implique une progression narrative avant).
- **Vers Proclamation** depuis n'importe où → toujours la séquence §3b (climax).

---

## 5. Notes de rythme (pour le régisseur)

- **Slides « discours »** (Bienvenue, Programme, BonAppetit) : peuvent rester
  affichées longtemps — elles ont toutes une **boucle de vie** (halo, particules,
  lustre, égaliseur) donc pas d'écran zombie.
- **Slides « énergie »** (DJ, Rappeurs, OuvertureBal) : idéalement 30 s–2 min max.
- **Proclamation** : ne jamais couper pendant les phases REVEAL — laisser la
  séquence complète se jouer (≈ 25 s jusqu'à DUO).
- **PhotosAmbiance & Default** : slides « tapisserie », peuvent tourner en boucle
  pendant les temps morts.
