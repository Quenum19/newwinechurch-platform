# Design Tokens — A Dark Night in Elegance

## Couleurs

### Noirs & Fonds
| Nom | Hex | Usage |
|---|---|---|
| Noir profond | `#0A0A0A` | Fond dominant, base des slides |
| Noir chaud | `#1a0f14` | Milieu de dégradé radial |
| Charbon | `#0d0a06` | Fond ultra-sombre alternatif |
| Brun profond | `#211a10` | Centre de dégradé radial or |

### Ors métalliques (indispensables)
| Nom | Hex | Usage |
|---|---|---|
| Or principal | `#C9A961` | Titres, ornements, texte accent |
| Or clair | `#E6C877` | Éclat, dégradés or |
| Or lumineux | `#EECF80` | Highlights, glow |
| Or chaud | `#ECCE7D` | Grands titres Cinzel |
| Or intense | `#FFE9A8` | Point haut de dégradé sur titres |
| Or foncé | `#7E662E` | Point bas de dégradé sur titres |
| Or transparent | `rgba(214,178,95,0.5-0.95)` | Filets, cadres |

### Crèmes & Ivoires
| Nom | Hex | Usage |
|---|---|---|
| Ivoire chaud | `#F5E6C8` | Texte corps principal, contrastes |
| Crème claire | `#F0E6CF` | Sous-titres élégants |
| Ivoire textile | `#D9CBB0` | Labels discrets |
| Ivoire pâle | `#F3E2B6` | Badges bordeaux (contraste) |

### Bordeaux & Vin
| Nom | Hex | Usage |
|---|---|---|
| Bordeaux profond | `#8B1A2F` | Accents, bloc rappel |
| Bordeaux ruban | `#8a2531` | Point haut ruban badge date |
| Vin sombre | `#5f1720` | Point bas ruban badge date |
| Vin translucide | `rgba(120,26,38,0.42)` | Fond ligne temps forts |
| Bordeaux dark | `#7a1f2b` | Alternatif accent |
| Bordeaux hover | `#6b1523` | Hover CTA |

## Typographie

Toutes chargées via Google Fonts. Import déjà fait dans `BalLiveScreen.jsx` — pas besoin de re-declare.

### Anton — Titres percutants
```css
font-family: 'Anton', Impact, sans-serif;
```
Usage : nom de l'event fullscreen, chiffres géants (compteurs), mots-cris. Utiliser en `text-transform: uppercase; letter-spacing: 0.02em`.

### Cinzel — Titres classiques élégants
```css
font-family: 'Cinzel', serif;
font-weight: 400 / 500 / 600 / 700 / 800 / 900;
```
Usage : sous-titres nobles, "BAL & DINE GALA", "A DARK NIGHT", dates, labels (500 weight, uppercase, letter-spacing).

### Great Vibes — Script manuscrit
```css
font-family: 'Great Vibes', cursive;
```
Usage : mots signature « Elegance », « Suis-nous », « Bienvenue » — UNIQUEMENT pour les moments forts. Grandes tailles (82-116px).

### Playfair Display — Serif italique
```css
font-family: 'Playfair Display', 'Georgia', serif;
font-style: italic;
```
Usage : sous-titres poétiques ("Une nuit de prestige..."), citations, corps de texte élégant. `font-weight: 400 / 700 / 900`.

### Cormorant Garamond — Serif lisible
```css
font-family: 'Cormorant Garamond', serif;
font-weight: 500 / 600;
```
Usage : corps de texte long, descriptions, texte italique pour accents.

## Ornements récurrents

### Losanges or (coins)
```css
width: 14px; height: 14px;
background: #E6C877;
transform: rotate(45deg);
box-shadow: 0 0 8px rgba(214,178,95,.6);
```
Position : `top: 20px; left: 20px;` (et 3 autres coins).

### Double filet or (cadre)
```css
/* Extérieur */
position: absolute; inset: 22px;
border: 2px solid rgba(214,178,95,.95);
box-shadow: 0 0 22px rgba(0,0,0,.35), inset 0 0 40px rgba(0,0,0,.15);

/* Intérieur */
position: absolute; inset: 30px;
border: 1px solid rgba(214,178,95,.5);
```

### Étoile ★ (U+2605)
```css
font-family: 'Cinzel', serif;
font-size: 82-160px;
color: #E6C877;
text-shadow: 0 0 28px rgba(214,178,95,.55), 0 2px 4px rgba(0,0,0,.6);
```

### Séparateurs
- `✦` (U+2726) — Losange à quatre pointes, séparateur classique
- `◆` (U+25C6) — Diamant, séparateur premium
- `— IN —` avec 2 filets 46×1px `rgba(214,178,95,.75)` de chaque côté

### Scrims (dégradés de lisibilité)
```css
/* Haut-droite radial */
background: radial-gradient(120% 120% at 100% 0%, rgba(0,0,0,.46), transparent 72%);

/* Bas linéaire */
background: linear-gradient(0deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.86) 8%, rgba(0,0,0,.5) 42%, transparent 100%);

/* Gauche linéaire */
background: linear-gradient(90deg, rgba(0,0,0,.4) 0%, transparent 100%);
```

## Effets & Animations récurrents

### Glow (autour du texte or)
```css
text-shadow:
  0 0 80px rgba(201,169,97,0.4),  /* halo doux large */
  0 2px 3px rgba(0,0,0,0.55),      /* ombre portée */
  0 0 18px rgba(214,178,95,0.35);  /* highlight or */
```

### Shimmer (animation subtile)
```css
@keyframes nwShimmer {
  0%,100% { opacity: .85 }
  50% { opacity: 1 }
}
animation: nwShimmer 4s ease-in-out infinite;
```

### Particules or
Voir `frontend/src/pages/live/components/GoldParticles.jsx` — composant Framer Motion avec particules or animées, densité paramétrable (`count={22-55}`, `intensity={0.7-1}`).

## À NE PAS FAIRE

- ❌ Bleu, vert, rouge vif — hors palette
- ❌ Blanc pur `#FFFFFF` — trop cru, préférer ivoire `#F5E6C8`
- ❌ Fond blanc — l'ambiance est nuit
- ❌ Emojis dans les titres — utiliser des glyphes typographiques (★ ✦ ◆)
- ❌ Sans-serif humaniste type Arial, Helvetica — hors charte
