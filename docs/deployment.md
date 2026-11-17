# Déploiement statique de ProjectShelf

ProjectShelf produit uniquement des fichiers statiques. Aucun job GitHub, aucune GitHub Action et aucun serveur applicatif ne sont nécessaires au fonctionnement du site.

## Builds de recette

Deux montages doivent être vérifiés avant une livraison :

```sh
npm run build -- --fixture --mode production --origin https://example.test --base /
npm run build -- --fixture --mode production --origin https://example.test --base /project-shelf/
```

Le contenu de `dist/` est toujours la racine du paquet à servir. Le préfixe est déjà inscrit dans les URL générées : il ne faut pas recréer un dossier `project-shelf/` à l'intérieur de `dist/` avant de monter le paquet sous `/project-shelf/`.

## Paquet local

```sh
node scripts/run-local-tool.mjs tsx scripts/package-static.ts --from dist --to .artifacts/project-shelf
```

Cette commande audite `dist`, refuse les liens symboliques distribués puis copie localement les fichiers. Elle ne met rien en ligne.

## Vérification d'un site déjà publié

```sh
node scripts/run-local-tool.mjs tsx scripts/verify-deploy.ts \
  --url https://example.org/project-shelf/ \
  --project mon-projet \
  --media media/mon-projet/poster.webp
```

La recette vérifie les accueils EN/FR, une vraie réponse HTTP 404, la fiche et son JSON public lorsqu'un identifiant est fourni, ainsi que MIME/cache lorsqu'un média est fourni. L'URL doit être explicitement passée : le script ne déduit jamais une production.

## Hébergeurs

- **OVH** : copier le paquet statique dans le répertoire correspondant au domaine ou sous-domaine. Ne pas installer de fallback SPA global qui transforme une URL inconnue en accueil HTTP 200.
- **Vercel** : servir `dist` comme sortie statique. ProjectShelf ne dépend d'aucune fonction Vercel.
- **GitHub Pages** : voir la section suivante. Aucune GitHub Action n'est utilisée : le site est construit localement puis publié par la branche `gh-pages` (« Deploy from a branch »).

## GitHub Pages

```powershell
npm run deploy:pages            # build de production + branche locale gh-pages, sans push
npm run deploy:pages -- --push  # idem, puis git push origin gh-pages
```

À lancer depuis PowerShell : Git Bash réécrit les arguments commençant par `/`.

La commande :

1. déduit l'adresse du site depuis le dépôt `origin` : `https://<owner>.github.io/<repo>/`, ou la racine pour un dépôt `<owner>.github.io` ;
2. lance `scripts/build.ts` en production pour cette origine et ce préfixe (validation du catalogue, projection publique, audit de `dist`) ;
3. ajoute `dist/.nojekyll`, sans lequel Jekyll ignorerait le dossier `_astro/`, et `dist/CNAME` avec `--cname` ;
4. vérifie les pages clés et les limites de Pages : 100 Mo par fichier (avertissement à 50 Mo), 1 Go par site ;
5. commite `dist` sur la branche locale `gh-pages` dans un worktree temporaire, sans toucher à la branche courante ni au répertoire de travail ;
6. ne pousse qu'avec `--push`.

Options : `--cname <domaine>` (domaine personnalisé servi à la racine), `--origin` et `--base` (adresse explicite), `--fixture` (essai local avec les projets de test : aucune branche n'est préparée et `--push` est refusé).

Une seule fois dans GitHub : *Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `(root)`*. Un dépôt privé exige un abonnement GitHub payant pour Pages ; le site publié reste public dans tous les cas.

Après publication :

```powershell
npm run verify:deploy -- --url https://<owner>.github.io/<repo>/ --project <id-projet>
```

## robots.txt sous préfixe

Un `robots.txt` servi sous `/project-shelf/robots.txt` ne contrôle pas à lui seul toute l'origine `https://example.org/`. Si le contrôle de crawl doit s'appliquer à l'origine entière, la configuration du `robots.txt` à la racine du domaine appartient au déploiement et doit être vérifiée séparément.
