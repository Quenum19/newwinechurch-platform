# Photos KIM B — diaporama slide live

Dépose ici les 3 photos de KIM B utilisées par la slide `KimBPhotosSlide` :

- `1.jpg` — portrait capuche (mural graffiti eyes en fond)
- `2.jpg` — assise casquette + lunettes (mur orange)
- `3.jpg` — assise bonnet fourrure + Gucci Cosmogonie (fond rose)

Formats acceptés : `.jpg` (recommandé — plus léger que PNG pour photo).

Résolution suggérée : 1920×1080 ou plus (portrait ou paysage — sera affichée en
`background-size: cover`, donc recadrage automatique).

Une fois déposées, la slide `/live/bal/{id}` en mode `kim-b-photos` fait défiler
les 3 photos toutes les 6 secondes en fondu enchaîné.

Pour ajouter/retirer des photos : modifier le tableau `PHOTOS` dans
`frontend/src/pages/live/slides/KimBPhotosSlide.jsx`.
