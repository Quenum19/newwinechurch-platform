# Cadres photos Festi Grill '26

4 templates HTML pour générer les PNG overlay que la plateforme applique
sur les photos de l'événement.

## Fichiers

| Fichier | Dimensions | Usage |
|---|---|---|
| `festi-grill-tv.html` | 1920×1080 | Écran live + partage général (16:9) |
| `festi-grill-landscape.html` | 1350×900 | Facebook + partage paysage (3:2) |
| `festi-grill-square.html` | 1080×1080 | Instagram feed (1:1) |
| `festi-grill-story.html` | 1080×1920 | Story IG/TikTok (9:16) |

## Aperçu rapide

Ouvre chaque fichier `.html` dans Chrome pour voir le rendu à taille réelle.

## Générer les PNG (Chrome Headless)

Depuis la racine du projet, exécute pour chaque fichier :

```bash
# TV 1920×1080
chrome --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --window-size=1920,1080 \
  --screenshot=festi-grill-tv.png \
  file:///c:/wamp64/www/newwinechurch/docs/festi-grill-frames/festi-grill-tv.html

# Landscape 1350×900
chrome --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --window-size=1350,900 \
  --screenshot=festi-grill-landscape.png \
  file:///c:/wamp64/www/newwinechurch/docs/festi-grill-frames/festi-grill-landscape.html

# Square 1080×1080
chrome --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --window-size=1080,1080 \
  --screenshot=festi-grill-square.png \
  file:///c:/wamp64/www/newwinechurch/docs/festi-grill-frames/festi-grill-square.html

# Story 1080×1920
chrome --headless --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --window-size=1080,1920 \
  --screenshot=festi-grill-story.png \
  file:///c:/wamp64/www/newwinechurch/docs/festi-grill-frames/festi-grill-story.html
```

`--default-background-color=00000000` = fond **transparent** (obligatoire pour
que la photo soit visible au centre).

## Alternative sans terminal

1. Ouvre le fichier `.html` dans Chrome
2. Menu → Plus d'outils → **Capture d'écran plein contenu** (`Ctrl+Shift+P`
   dans DevTools → tape `screenshot`)
3. Redimensionne l'image obtenue aux dimensions exactes attendues

Le rendu Chrome n'est pas idéal pour la transparence — préférer Chrome
Headless ligne de commande.

## Installation sur la plateforme

Une fois les 4 PNG générés :

```bash
# Déposer dans le dossier backend
cp festi-grill-*.png c:/wamp64/www/newwinechurch/backend/resources/frames/
```

Puis mettre à jour l'event Festi Grill dans l'admin :

- `/admin/events/{id_festi_grill}/hub` → onglet **Configuration**
- Modifier `brand_frames` :

```json
{
  "tv":        "frames/festi-grill-tv.png",
  "landscape": "frames/festi-grill-landscape.png",
  "square":    "frames/festi-grill-square.png",
  "story":     "frames/festi-grill-story.png"
}
```

Sauver, puis re-tester avec le bouton "Envoi ticket test" ou uploader
une photo dans la galerie de l'event → le cadre Festi Grill s'appliquera
automatiquement.

## Personnalisation

- **Couleurs** : édite le CSS de chaque fichier
  - Jaune moutarde `#E4B93A` (titre GRILL '26 + date)
  - Feu orange `rgba(220, 60, 15, 0.85)` (bordure)
  - Blanc `#fff` (accents)
- **Police titre** : `Anton` (Google Fonts) — remplace par `Bebas Neue` ou
  `Impact` si tu préfères plus lourd
- **Feuilles persil** : emoji 🌿 — remplace par un SVG persil réaliste si tu
  as un asset (mettre une balise `<img>` à la place de l'emoji)
- **Textes date/lieu** : dans le HTML directement (bandeaux `.top` et `.bottom`)

## Notes

- Le **centre** de chaque cadre est **transparent** (pour laisser la photo apparaître)
- Les **bordures colorées feu** occupent ~30-40px sur chaque côté (n'empiètent
  presque pas sur la photo)
- Les **bandeaux haut/bas** ont un dégradé noir → transparent qui laisse voir
  la photo par transparence progressive (esthétique de story IG)
