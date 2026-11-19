# project-shelf
A visual project showcase with video previews, rich project galleries, and bilingual SEO. Built with Astro, React, and TypeScript.

**Vitrine :** https://karlos-fr.github.io/project-shelf/

**L'étagère 3D :** https://karlos-fr.github.io/project-shelf/fr/shelf/ ([English](https://karlos-fr.github.io/project-shelf/en/shelf/)). C'est une version séparée de la vitrine, en Three.js temps réel (WebGPU, repli WebGL), avec les boîtes d'époque des projets. Elle est pensée pour un ordinateur : sur iPhone, Safari peut fermer la page faute de mémoire.

**La chambre 3D (en construction) :** https://karlos-fr.github.io/project-shelf/fr/chambre/ ([English](https://karlos-fr.github.io/project-shelf/en/chambre/)). Une chambre de la fin des années 90 où l'on passe d'un point de vue à l'autre d'un clic ; l'étagère y porte les projets sortis en boîte. Pensée pour un ordinateur. Voir le [plan](docs/superpowers/plans/2026-11-19-chambre-plan.md).

## État de la branche

La direction visuelle T0 est approuvée par l'auteur. Les tâches T1 à T15 sont implémentées : vitrine Astro/React, fiches et popin, médias, Featured, SEO, portabilité et documentation éditoriale. Le 11 novembre 2026, la recette locale complète (contrats natifs, `astro check`, Vitest, build fixture, tests du build et Playwright Chromium) passe sur Windows. **Le catalogue réel est encore vide** : aucun projet n'est publié, et Firefox/WebKit, mobile réel, URL de production et Search Console restent à contrôler.

Voir le [suivi d'exécution](docs/superpowers/plans/2026-09-06-project-shelf-execution-status.md), le [plan détaillé](docs/superpowers/plans/2026-09-06-project-shelf-implementation.md), la [spécification](docs/superpowers/specs/2026-09-06-project-showcase-design.md) et les [consignes agents](AGENT.md).

## Installation et vérifications locales

Prérequis déclarés : Node >= 22.12.0 et npm >= 9.6.5. Les dépendances ont été installées sur le poste Windows de l'auteur (Node 24.14.1) et `package-lock.json` est issu de cette installation réelle. Les installations reproductibles utilisent `npm ci`, pas une nouvelle résolution.

Recette complète, à lancer depuis **PowerShell** (Git Bash réécrit l'argument `--base /` en chemin Windows et le build le refuse à juste titre) :

```powershell
npm ci
node scripts/run-local-tool.mjs playwright install chromium
npm run verify
```

`npm run verify` enchaîne validation du catalogue, contrats natifs, build fixture de production, `astro check`, Vitest, tests du build, Playwright et mesure de la sortie. `npm run setup` reste disponible pour une nouvelle résolution volontaire des versions ; revoir alors le manifeste et le lock avant de les committer.

`npm run test:bootstrap` contrôle le module de configuration, la résolution locale des CLI et des garde-fous dans les sources. **Il ne compile pas Astro et ne remplace ni Vitest ni les tests de navigateur.** Les commandes de test principales utilisent exclusivement les paquets npm locaux : un exécutable global homonyme, notamment Playwright Python, ne doit pas les remplacer silencieusement.

## Contrôles indépendants de npm

```sh
npm run test:native
```

Cette commande ne télécharge rien. Elle utilise Node avec suppression native des types et exécute les contrats purs du projet : **285 tests passent, aucun ignoré** (Windows, Node 24.14.1, 11 novembre 2026). Les contrats de publication et du chargeur de fiche importent le schéma `zod/mini` : ils exigent donc `node_modules`, les autres restent indépendants de npm. Ces contrats couvrent notamment configuration, validation, publication, routes, navigation, médias, Featured, SEO et mesure de sortie.

La suppression des types ne les vérifie pas. `tsconfig.domain.json` permet un contrôle séparé des fonctions sans dépendance. Avec le compilateur du projet installé (TypeScript 6.0.3) :

```sh
node node_modules/typescript/bin/tsc --project tsconfig.domain.json
```

Aucun de ces contrôles ne remplace le build Astro, `astro check`, le navigateur ou les tests de l'export final.

Les fixtures sont synthétiques. L'audit de sentinelles complète une future projection par liste blanche, sans être un détecteur universel de secrets. Aucun catalogue personnel n'est encore publié.

## Développement

Après installation : `npm run dev`. Pour la recette statique : `npm run build`, puis `npm run preview`. Le serveur de recette est attendu sur `127.0.0.1:4321` et Playwright refuse de réutiliser un serveur inconnu. Aucune commande ne déclenche de GitHub Action ni de déploiement.

La configuration lit `SITE_MODE` (`preview` par défaut), `SITE_ORIGIN` (`http://localhost:4321` en preview) et `SITE_BASE` (`/` par défaut). Fournir ces valeurs comme variables du processus ; aucun chargement de fichier `.env` personnalisé n'est implémenté à ce stade. Une production exige son origine HTTPS explicite. Les préfixes relatifs, traversées, identifiants et origines avec chemin sont refusés. `SITE_FIXTURE=true` permet uniquement les domaines réservés aux tests, pas une publication factice.

Le layout T1 demeure volontairement `noindex, nofollow`, y compris avec une configuration de production. Le référencement final sera implémenté en T5/T12. Aucun domaine de production, catalogue réel ni média privé n'est inventé.

## Références visuelles

L'approbation et les valeurs de présentation sont consignées dans [l'approbation T0](docs/design/approval.md). La maquette est un démonstrateur jetable distinct de l'application. Les résultats de revue visuelle antérieurs ne constituent pas des tests du socle Astro.
