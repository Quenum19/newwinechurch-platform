# Cadres photo — Festi Grill '26

Cadres appliqués automatiquement aux photos de l'événement quand on les
télécharge depuis le site (galerie de l'événement et médiathèque).

Design repris de la maquette Claude Design « Festi Grill 26 — Story 9x16 »
(aperçu : `maquette-reference-story.jpg`).

## Où vivent les fichiers

| Élément | Emplacement |
|---|---|
| Sources (templates HTML + générateur) | ce dossier |
| PNG utilisés par le site | `backend/resources/frames/festi-grill-{tv,landscape,square,story}.png` |
| Logo | `frontend/public/logos/logo_newwine.png` (source unique, pas de copie) |
| Rattachement à l'événement | migration `2026_09_18_100000_set_festi_grill_brand_frames` (`events.brand_frames`) |

| Format | Dimensions | Usage |
|---|---|---|
| tv | 1920×1080 | Écran 16:9, partage général |
| landscape | 1350×900 | Facebook / paysage |
| square | 1080×1080 | Post Instagram |
| story | 1080×1920 | Story Instagram / TikTok |

Le centre de chaque cadre est transparent : la photo remplit toute la surface,
le cadre ajoute la bande ambre à gauche, le logo et le titre.

## Modifier le design

```bash
cd docs/festi-grill-26/cadres-photos
npm install                 # une seule fois
npm run install-browser     # une seule fois (Chromium pour Playwright)
npm run build               # régénère les HTML puis écrit les 4 PNG dans backend/resources/frames/
```

Tout le design est dans `generate-frames-html.php` (styles + tailles par format).
Le rendu passe par Playwright (`rasterize.mjs`) avec `omitBackground` : Chrome
headless sous Windows ne gère plus la transparence via `--default-background-color`.

## Après une modification

1. Commit + push des PNG → déploiement automatique.
2. Les téléchargements de la **médiathèque** prennent le nouveau cadre tout seuls
   (le cache est indexé sur la date du fichier cadre).
3. Les photos de la **galerie de l'événement** sont pré-composées à l'envoi :
   les régénérer sur le serveur avec

   ```bash
   cd ~/nwc_backend && php artisan gallery:recompose --event=festi-grill-26
   ```
