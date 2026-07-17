# 🚀 Déploiement automatique GitHub → Hostinger

À chaque `git push origin main`, GitHub Actions déploie automatiquement le
backend Laravel + le frontend React sur Hostinger. Zéro action manuelle.

Setup one-time à faire une seule fois. Après, c'est du push-and-forget.

---

## 📋 Vue d'ensemble

```
┌─────────────┐    push    ┌─────────────┐   SSH+rsync    ┌───────────┐
│  VS Code    │──────────→ │   GitHub    │───────────────→│ Hostinger │
│  (ton PC)   │            │   Actions   │                │   Prod    │
└─────────────┘            └─────────────┘                └───────────┘
     git commit           .github/workflows/deploy.yml       Site live
     git push
```

Ce que fait le workflow à chaque push :

1. **Détecte** si `backend/` et/ou `frontend/` a changé
2. **Backend** : rsync backend/ → `~/nwc_backend/` + composer install + migrate + cache
3. **Frontend** : npm ci → npm run build → rsync `dist/` → `public_html/`
4. **Notification** de succès/échec dans GitHub

Temps typique : **~90 secondes**.

---

## 🔐 Setup (à faire une fois)

### Étape 1 — Récupérer les infos de connexion SSH Hostinger

Va sur **hPanel → Advanced → SSH Access**. Tu verras :

- **SSH IP** (exemple `us-bos-web1780.main-hosting.eu` ou une IP `82.180.xxx.xxx`)
- **SSH Port** (souvent `65002` sur Hostinger, parfois `22`)
- **SSH Username** (tu as vu : `u781799599`)

Note ces 3 infos, on va les mettre dans GitHub Secrets à l'étape 4.

### Étape 2 — Créer une paire de clés SSH DÉDIÉE au deploy

⚠️ **Ne pas réutiliser une clé SSH personnelle** — crée-en une nouvelle,
uniquement pour GitHub Actions. Si compromise, tu la révoques sans tout casser.

Sur ton PC (Git Bash sur Windows) :

```bash
ssh-keygen -t ed25519 -C "github-actions-nwc" -f ~/.ssh/nwc_deploy -N ""
```

Ça crée deux fichiers dans `~/.ssh/` :
- `nwc_deploy` → **clé PRIVÉE** (secret GitHub, ne partage JAMAIS)
- `nwc_deploy.pub` → **clé PUBLIQUE** (à mettre sur Hostinger)

### Étape 3 — Autoriser la clé publique sur Hostinger

Copie le contenu de la clé publique :

```bash
cat ~/.ssh/nwc_deploy.pub
```

Ça affiche une ligne du style :
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-nwc
```

**Connecte-toi en SSH sur Hostinger** avec ta méthode habituelle, puis :

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "COLLE_ICI_LA_CLE_PUBLIQUE_COMPLETE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Test rapide depuis ton PC pour vérifier que ça marche :

```bash
ssh -i ~/.ssh/nwc_deploy -p 65002 u781799599@TON_SSH_HOST
```

Tu dois te connecter **sans mot de passe**. Si ça marche, c'est bon.

### Étape 4 — Ajouter les secrets dans GitHub

Va sur ton repo → **Settings → Secrets and variables → Actions → New repository secret**.

Ajoute **5 secrets** :

| Nom du secret            | Valeur                                                          |
|--------------------------|-----------------------------------------------------------------|
| `HOSTINGER_HOST`         | ton SSH host (ex : `us-bos-web1780.main-hosting.eu` ou l'IP)   |
| `HOSTINGER_USER`         | `u781799599`                                                    |
| `HOSTINGER_PORT`         | `65002` (ou le port fourni par Hostinger)                       |
| `HOSTINGER_SSH_KEY`      | contenu COMPLET de `~/.ssh/nwc_deploy` (clé privée)             |
| `HOSTINGER_FRONTEND_PATH`| chemin absolu du dossier frontend sur le serveur (voir ci-dessous) |

Pour la clé privée : sur ton PC, ouvre le fichier `~/.ssh/nwc_deploy` dans un éditeur
et colle **TOUT** le contenu (avec les lignes `-----BEGIN OPENSSH PRIVATE KEY-----` et
`-----END OPENSSH PRIVATE KEY-----`).

Pour `HOSTINGER_FRONTEND_PATH` : c'est le chemin ABSOLU du dossier où sert le frontend.
Généralement l'un de ces trois :
- `/home/u781799599/domains/newwinechurch.ci/public_html/`
- `/home/u781799599/public_html/`
- `/home/u781799599/domains/newinechurch.org/public_html/`

Sur ton SSH Hostinger, tape `realpath ~/domains/*/public_html` pour obtenir le bon chemin.

### Étape 5 — Premier déploiement (test)

Fais un petit commit vide pour tester :

```bash
git commit --allow-empty -m "test: premier deploy CI"
git push origin main
```

Va sur ton repo → onglet **Actions**. Tu dois voir le workflow "Deploy NWC to Hostinger"
en cours. Clique dessus pour suivre en direct.

Si tout est vert (2-3 min) → **c'est bon**, tu peux fermer VSCode pour toujours 😄

---

## 🎯 Utilisation quotidienne

Après le setup, plus rien à faire :

```bash
git add .
git commit -m "feat: nouvelle fonctionnalité X"
git push origin main
```

**GitHub Actions se déclenche automatiquement**, le site est à jour en ~90 sec.

Tu peux suivre les déploiements dans l'onglet **Actions** du repo.

---

## 🛡 Bonnes pratiques

### 1. Ne jamais commit `.env`

Le fichier `backend/.env` (avec mots de passe BDD, clés API, etc.) est déjà
dans `.gitignore`. Il vit UNIQUEMENT sur ton PC (dev) et sur Hostinger (prod).

Le workflow exclut explicitement `.env` de l'upload → le `.env` prod ne sera
jamais écrasé.

### 2. Migrer avec précaution

Le workflow lance `php artisan migrate --force` en prod. Si tu écris une migration
destructive (drop column avec données), elle sera appliquée immédiatement au push.

**Règle** : teste toujours en local avant de push.

### 3. Rollback rapide

Si un déploiement casse la prod, tu peux revenir en arrière via :

```bash
git revert HEAD
git push origin main
```

Le workflow re-déploie automatiquement la version précédente.

### 4. Skip le déploiement pour un commit

Si tu veux commit sans déclencher le deploy (doc, README, etc.) :

```bash
git commit -m "docs: update README [skip ci]"
```

Le `[skip ci]` dans le message dit à GitHub Actions de ne rien lancer.

---

## 🔧 Modifier le workflow

Le fichier à éditer : `.github/workflows/deploy.yml`

Cas classiques :

- **Ajouter une variable d'env au build frontend** : éditer la section `env:`
  du job `deploy-frontend`, ex : `VITE_API_URL: https://newwinechurch.ci/api`

- **Changer les branches déclencheuses** : modifier `on: push: branches: [main]`
  → `[main, staging]`

- **Ajouter une commande post-deploy backend** : ajouter une ligne dans le
  bloc `script:` du step "Post-deploy Laravel"

---

## ❓ Troubleshooting

### "Permission denied (publickey)"

La clé SSH n'est pas correctement installée sur Hostinger.
→ Refais l'étape 3, vérifie que `chmod 600 ~/.ssh/authorized_keys`.

### "Host key verification failed"

L'action rsync ne connaît pas encore le serveur.
→ La lib gère ça automatiquement, mais si ça bloque, ajoute
`--exclude='.git*'` dans les switches rsync.

### Le déploiement met à jour les fichiers mais le site montre l'ancien

Cache navigateur ou cache Laravel.
→ Hard refresh (Ctrl+Shift+R) + le workflow fait déjà les `cache:clear`.

### La migration bloque

Elle est peut-être trop lente (> 10 min) ou attend un input.
→ Va sur SSH manuellement pour investiguer : `php artisan migrate:status`.

### GitHub Actions échoue avec "npm ci failed"

Le lockfile est peut-être obsolète.
→ En local : `cd frontend && npm install && git commit package-lock.json`.

---

## 🎁 Bonus : Notification Slack / Discord

Si tu veux recevoir une notif à chaque deploy, ajoute ce step à la fin du job `notify` :

```yaml
- name: Notif Discord
  if: always()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
    title: "Deploy NWC"
    description: "${{ github.event.head_commit.message }}"
```

Crée un webhook Discord et ajoute-le en secret `DISCORD_WEBHOOK`.

---

**Fin du setup** — tu es prêt à déployer comme les grands 🚀
