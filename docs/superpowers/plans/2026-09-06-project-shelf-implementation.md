# ProjectShelf — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. `superpowers:subagent-driven-development` is an alternative only in an environment that actually supports independent agents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire la vitrine bilingue de l'auteur, avec aperçus vidéo, fiches partageables en popin et pages statiques réellement indexables.

**Architecture:** Astro pré-génère les pages et les fichiers JSON publics ; une racine React pré-rendue synchronise galerie, navigation et médias. Un pipeline séparé valide le catalogue puis sélectionne explicitement les données et ressources publiables avant le build. Aucun service GitHub, LLM, serveur applicatif ou base de données n'intervient pendant une visite.

**Tech Stack:** Astro, TypeScript strict, React, CSS natif, Zod pour la validation, Vitest pour les fonctions et composants, Testing Library, Playwright pour le navigateur et les parcours sans JavaScript.

**Spec:** `docs/superpowers/specs/2026-09-06-project-showcase-design.md` — version 1.0 approuvée par l'auteur dans la conversation le 6 septembre 2026, clarifications de la section 2 comprises.

**Dépôt :** `Karlos-fr/project-shelf` ; branche examinée : `main`, commit `bccdce8f0c20882fd5a3f184ce58066d046c51c7`.

**Statut :** plan proposé après validation de la spécification ; aucune tâche de développement exécutée. Le dépôt examiné ne contient que le README et la spécification. Aucun fichier AGENT.md ou AGENTS.md n'y était présent. Relire l'arbre et les éventuelles nouvelles consignes avant exécution.

## Global Constraints

Les formulations suivantes reprennent les exigences de la spécification ; elles s'appliquent à toutes les tâches.

- « Astro + TypeScript + React pour l’interactivité » ; « Export statique portable entre Vercel, GitHub Pages et OVH ».
- « Sombre uniquement, fond anthracite » ; « Une couleur globale : bleu `#4DA3FF` ».
- « Médias 16:9 ; quatre colonnes sur desktop comme base ajustable ».
- « La maquette doit fixer les nuances exactes, espacements et typographies avant l’implémentation visuelle. »
- « Catalogue | `projects.ts`, préparé et maintenu avec un LLM, relu avant publication ».
- « Multiples par projet, issues des données, filtres OR, affichage alphabétique ».
- « Le tri initial est `updatedAt` décroissant ; le second choix est `createdAt` décroissant. »
- « Anglais et français ; détection automatique ; anglais par défaut ».
- « Chaque carte est un vrai lien HTML. » ; « Aucun second contenu éditorial n’est maintenu pour ce repli. »
- « Une commande distincte “Lire cet aperçu” permet de sélectionner un poster secondaire dans le carrousel. » Le lien de carte ouvre toujours la fiche.
- « Aucun LLM ni token GitHub n’intervient pendant la visite du site. »
- « Les champs internes, projets masqués et médias exclusivement associés à ces projets sont exclus du HTML, JSON, scripts, index de recherche, plans de site et fichiers distribués. »
- « Les builds et les tests du projet doivent pouvoir être exécutés localement, sans dépendre de jobs GitHub Actions lancés depuis cette conversation. »

Les citations typographiques ci-dessus peuvent différer sur les guillemets internes, pas sur la règle. La spécification reste prioritaire. Les seuils responsive de départ sont 1280/1024/640 pixels ; le poster Featured reste six secondes sans vidéo. Ne pas introduire de thème clair, CMS, statistiques GitHub ou synchronisation à l'exécution.

Les exemples de catalogue du plan sont des **fixtures fictives**, jamais des affirmations sur SpotifyAmp ou un autre projet réel. `https://example.test` est réservé aux tests ; le domaine de production reste une configuration à fournir avant publication. La sélection d'un nom de logiciel ne remplace pas l'identité personnelle affichée sur le site.

## Séquence, revue et preuve

Ordre : **T0 (maquette et validation), T1 à T15**. Les tâches forment une seule application ; chaque livraison a néanmoins un test et un point de revue distincts. La rédaction du présent plan n'autorise ni le démarrage automatique de T1, ni une mise en production.

Exécuter chaque cycle dans cet ordre : test ciblé qui échoue pour la raison attendue, implémentation minimale, test ciblé vert, tests de régression, revue du diff, commit limité à la tâche. Ne cocher une étape qu'après preuve. Si un navigateur ou un hébergement n'est pas accessible, laisser son contrôle non coché et le signaler. Ne jamais convertir un contrôle manuel non réalisé en résultat positif automatique.

Ne pas créer de workflow GitHub Actions. Les commandes sont exécutées dans un environnement local disponible ; elles ne supposent pas l'accès au PC Windows de l'auteur. Isoler le travail avec `using-git-worktrees` à l'exécution si le dépôt est partagé avec d'autres travaux. Ne pas supprimer ni réinitialiser les modifications d'un autre agent.

## Carte des fichiers et limites

| Zone | Fichiers principaux | Responsabilité |
|---|---|---|
| Configuration | `astro.config.mjs`, `package.json`, `tsconfig.json`, `src/config/site.ts` | Build statique, origine, préfixe, identité |
| Données | `src/data/projects.ts`, `src/domain/project.ts`, `src/domain/schema.ts` | Catalogue déclaratif et contrat validé |
| Publication | `scripts/build.ts`, `scripts/publish-catalogue.ts`, `scripts/media-manifest.ts`, `scripts/audit-dist.ts` | Validation, liste blanche, copie et inspection des exports |
| Sources médias | `content/media/` | Originaux ; aucun accès public implicite |
| Fichiers générés | `.generated/catalogue.json`, `.generated/details/`, `.generated/public/` | Export assaini seulement ; ignorés par Git |
| Domaine client | `src/domain/gallery.ts`, `src/domain/routes.ts`, `src/domain/locale.ts` | Fonctions pures : recherche, tri, catégories, URL, langue |
| État navigateur | `src/navigation/history.ts`, `src/navigation/details-loader.ts`, `src/navigation/useShowcase.ts` | Historique, chargement annulable, synchronisation |
| Interface | `src/components/ShowcaseApp.tsx`, `ProjectCard.tsx`, `ProjectGrid.tsx`, `ProjectFilters.tsx`, `SiteHeader.tsx` | Une racine React, une carte commune |
| Fiches | `src/components/ProjectDetails.tsx`, `ProjectModal.tsx`, `MediaCarousel.tsx` | Même contenu en article et en popin |
| Médias | `src/media/coordinator.ts`, `src/media/playback.ts`, `src/media/usePreview.ts` | Arbitrage, autoplay et cycles de vie |
| Featured | `src/featured/machine.ts`, `src/components/FeaturedCarousel.tsx` | État de rotation séparé du rendu |
| SEO | `src/seo/model.ts`, `src/seo/structured-data.ts`, `src/seo/sitemap.ts`, `src/components/SeoHead.astro`, `src/seo/sync-head.ts` | Génération commune HTML et navigation |
| Routes | `src/pages/index.astro`, `src/pages/[lang]/index.astro`, `src/pages/[lang]/projects/[id].astro`, `src/pages/data/projects/[id].json.ts`, `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`, `src/pages/404.astro` | Routes explicites pré-générées |
| Présentation | `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/components.css`, `src/i18n/messages.ts` | Thème et libellés EN/FR |
| Tests | `tests/unit/`, `tests/components/`, `tests/build/`, `tests/e2e/`, `tests/fixtures/` | Contrats, DOM, sortie statique, navigateurs |
| Documentation | `docs/design/`, `docs/content-authoring.md`, `docs/deployment.md`, `docs/verification.md` | Maquette, alimentation, publication, preuves |

`src/data/projects.ts` n'est importé que par les outils de publication. Le navigateur reçoit les résumés publics et un index de recherche bilingue, pas toutes les galeries détaillées. Le fichier de détail JSON est statique et public ; ce n'est pas une API nécessitant un serveur. Les composants ne lisent ni le disque ni les variables secrètes.

## Contrats communs à garder identiques entre tâches

Les déclarations ci-dessous définissent les interfaces à réaliser, pas des modules déjà existants. Les schémas Zod de T2 et les types TypeScript doivent rester une seule source de vérité (`z.infer`), sans deux listes divergentes de champs.

```ts
export type Locale = 'en' | 'fr';
export type Localized<T> = Record<Locale, T>;
export type GalleryState = {
  categories: string[];
  sort: 'updated' | 'created';
  q: string;
};
export type RouteState = GalleryState & { locale: Locale; projectId: string | null };
export type Category = { id: string; label: Localized<string> };
export type ImageMedia = {
  type: 'image'; src: string; width: number; height: number;
  alt: Localized<string>;
};
export type VideoMedia = {
  type: 'video'; src: string; poster: string;
  title: Localized<string>; description: Localized<string>;
  width: number; height: number; uploadDate?: string; durationSeconds?: number;
  captions?: { locale: Locale; src: string }[];
  transcript?: Localized<string>;
};
export type ProjectContent = {
  tagline: string; description: string; features: string[];
  limits?: string; motivation?: string;
  seo?: { title?: string; description?: string; image?: string };
};
export type Project = {
  id: string; name: string; categories: string[];
  createdAt: string; updatedAt: string;
  status: 'prototype' | 'active' | 'stable' | 'archived';
  repositoryVisibility: 'public' | 'private'; repositoryUrl?: string;
  hidden: boolean; indexable: boolean; featured: boolean; featuredOrder?: number;
  stack: string[];
  preview: {
    poster: string; width: number; height: number; video?: string;
    posterDurationMs?: number; objectPosition?: string;
  };
  media: (ImageMedia | VideoMedia)[];
  links: { type: 'demo' | 'website' | 'release' | 'documentation'; url: string }[];
  content: Localized<ProjectContent>;
  pageUpdatedAt?: Partial<Localized<string>>;
  application?: { operatingSystem: string; applicationCategory: string };
};
export type Catalogue = { categories: Category[]; projects: Project[] };
export type PublicProject = Omit<Project, 'hidden'>;
export type ProjectSummary = Pick<PublicProject,
  'id' | 'name' | 'categories' | 'createdAt' | 'updatedAt' | 'featured' |
  'featuredOrder' | 'preview' | 'stack'> & {
  tagline: Localized<string>; searchText: string;
};
export type PublishedCatalogue = {
  categories: Category[]; summaries: ProjectSummary[];
  details: Record<string, PublicProject>;
};
export type SiteConfig = {
  origin: string; base: string; mode: 'preview' | 'production';
  name: string; intro: Localized<string>; githubUrl: string;
};
export type SeoModel = {
  title: string; description: string; canonical: string;
  lang: Locale; noindex: boolean; image?: string;
  alternates: { lang: Locale | 'x-default'; href: string }[];
  jsonLd: Record<string, unknown>[];
};
```

L'extension facultative `application` permet de décrire honnêtement un logiciel dans JSON-LD ; ce n'est pas une déduction depuis le nom ou une note fabriquée. Les types seuls ne garantissent pas l'absence d'une URL privée : T3 impose une projection contrôlée et un audit de l'export. `uploadDate` est une date réelle de publication vidéo au format ISO, distincte des dates du projet.

## T0 — Maquette et point d'arrêt visuel

**Files:** créer `docs/design/visual-review.md` et les images de référence de l'accueil desktop, mobile et fiche dans `docs/design/`. Aucun code applicatif.

**Interfaces:** consomme la spécification ; produit les références visuelles approuvées et les jetons exacts destinés à T6.

- [ ] **Step 1 — Préparer les trois vues.** Accueil desktop de 1440 pixels avec Featured 1+2 et grille de quatre cartes ; accueil mobile de 390 pixels ; fiche avec grand média et bande de vignettes, vidéo en premier. Un état vide et un libellé français long doivent être visibles dans les variantes de revue.
- [ ] **Step 2 — Présenter sans fausses captures.** Utiliser les médias autorisés disponibles ou afficher explicitement « Illustration temporaire ». Conserver fond anthracite, accent `#4DA3FF`, une seule carte réutilisée, aucun thème laboratoire/arcade.
- [ ] **Step 3 — Obtenir et consigner la validation.** Documenter police, tailles, espacements, surfaces, contraste des actions et corrections demandées. Ne pas marquer ce point approuvé sur la seule base de la validation du présent plan.
- [ ] **Step 4 — Versionner seulement les références validées.** Commit proposé : `docs: approve ProjectShelf visual references`. T1 peut ensuite être engagée sur demande d'exécution.

## T1 — Socle statique et harnais de test exécutables

**Files:** créer `package.json`, lockfile npm, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/config/site.ts`, `src/pages/index.astro`, `src/pages/404.astro`, `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`, `tests/build/shell.test.ts`, `tests/e2e/shell.spec.ts` ; enrichir `README.md` sans remplacer sa description.

**Interfaces:** `loadSiteConfig(env: Record<string, string | undefined>): SiteConfig`. Au départ, l'identité et les langues sont des valeurs explicites ; le catalogue sera branché en T3. Commandes stables : `npm run check`, `npm run test:unit -- <fichier>`, `npm run build`, `npm run test:build`, `npm run test:e2e -- <fichier>`.

- [ ] **Step 1 — Installer l'outillage puis écrire le test rouge.** Vérifier les exigences Node avec `npm view astro engines` et `npm view vitest engines`, installer des versions compatibles et les verrouiller ; noter les versions effectivement résolues dans le README. Ne pas attribuer au plan une version jamais vérifiée.

```sh
npm init -y
npm install --save-exact astro @astrojs/react react react-dom zod
npm install --save-dev --save-exact typescript @astrojs/check @types/react @types/react-dom @types/node vitest jsdom @testing-library/react @testing-library/jest-dom @playwright/test tsx cheerio
```

```ts
// tests/build/shell.test.ts
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
it('produit un accueil anglais utilisable sans client', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  expect(html).toContain('lang="en"');
  expect(html).toContain('ProjectShelf');
});
```

- [ ] **Step 2 — Observer l'échec.** `npm run test:build -- tests/build/shell.test.ts` : fichier absent avant création de la route. Une erreur d'installation n'est pas la preuve fonctionnelle attendue.
- [ ] **Step 3 — Produire le minimum testable.** Configuration Astro `output: 'static'`, `trailingSlash: 'always'`, `build: { format: 'directory' }`, intégration React. `npm run build` utilise initialement `astro build`. Vitest sépare tests build et unitaires par scripts et fichiers ; Playwright démarre `astro preview` avec port fixe et vérification de disponibilité. Ne pas créer de fallback SPA. [R1, R2, R5]

```json
{
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "astro build",
    "preview": "astro preview --host 127.0.0.1 --port 4321",
    "test:unit": "vitest run tests/unit tests/components",
    "test:build": "vitest run tests/build",
    "test:e2e": "playwright test"
  }
}
```

Vitest prend Node par défaut ; les fichiers composants portent l'annotation `// @vitest-environment jsdom` et `tests/setup.ts` installe les assertions jest-dom. Une commande ciblée ne doit pas lancer par inadvertance les tests du build avant que `dist/` existe. Dans Playwright, définir `use.baseURL` sur `http://127.0.0.1:4321` et `webServer.command` sur `npm run preview`, avec attente de cette URL. T3 remplace le script build par `tsx scripts/build.ts`, et T15 ajoute le script d'orchestration `verify`.

```ts
// Base de tests/e2e/shell.spec.ts
import { test, expect } from '@playwright/test';
test('rend un titre avec JavaScript désactivé', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.close();
});
```

- [ ] **Step 4 — Vérifier.** `npm run check`, `npm run build`, test build ciblé, puis `npm run test:e2e -- tests/e2e/shell.spec.ts`. Installer les navigateurs Playwright localement avant cette dernière commande ; rapporter toute indisponibilité.
- [ ] **Step 5 — Commit.** `chore: establish static Astro shell and local tests`. Cocher les étapes réalisées et conserver les sorties utiles, pas les dépendances ni les rapports binaires dans Git.

## T2 — Schéma du catalogue et fixtures bilingues

**Files:** créer `src/domain/project.ts`, `src/domain/schema.ts`, `src/data/projects.ts`, `tests/fixtures/catalogue.ts`, `tests/unit/schema.test.ts`, `scripts/validate-catalogue.ts`.

**Interfaces:** `parseCatalogue(input: unknown): Catalogue` lève une erreur avec chemin de champ ; `minimalProject(overrides?: Partial<Project>): Project` est une fabrique réservée aux tests. Le fichier de production commence avec `categories: []` et `projects: []` ; aucune fixture ne devient un projet réel par défaut.

- [ ] **Step 1 — Écrire les tests rouges de dates, catégories et traductions.** La fixture de base possède les deux langues, un poster `/media/example/poster.webp`, des dates `2026-09-01`/`2026-09-02`, `hidden: false`, `indexable: true` et une catégorie `audio` définie EN/FR.

```ts
import { expect, it } from 'vitest';
import { parseCatalogue } from '../../src/domain/schema';
import { minimalProject, fixtureCategories } from '../fixtures/catalogue';
it('refuse une mise à jour antérieure à la création', () => {
  const p = minimalProject({ updatedAt: '2026-08-31' });
  expect(() => parseCatalogue({ categories: fixtureCategories, projects: [p] })).toThrow();
});
it('refuse une date de calendrier impossible', () => {
  const p = minimalProject({ createdAt: '2026-02-30' });
  expect(() => parseCatalogue({ categories: fixtureCategories, projects: [p] })).toThrow();
});
```

- [ ] **Step 2 — Exécuter le test.** `npm run test:unit -- tests/unit/schema.test.ts` : export absent ou validation non implémentée.
- [ ] **Step 3 — Implémenter le schéma strict.** Utiliser Zod, `z.infer`, objets stricts, langues obligatoires, slug ASCII `^[a-z0-9]+(?:-[a-z0-9]+)*$`, dates calendaires réellement valides et `updatedAt >= createdAt`. Rejeter slugs/catégories dupliqués, références inconnues, chaîne vide, dimensions non positives, NaN, types de liens inconnus et durées non positives. Réserver les URL `https://` aux ressources externes ; rejeter `javascript:`, `data:`, les chemins réseau `//`, traversées `..`, antislashs et caractères de contrôle. Les médias locaux utilisent le préfixe logique `/media/`.

```ts
const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
```

- [ ] **Step 4 — Vérifier la matrice.** Ajouter tests pour traduction manquante, catégorie inconnue, doublon, URL dangereuse et borne de date. `npm run test:unit -- tests/unit/schema.test.ts` et `npm run check` doivent réussir. Le script de validation affiche tous les chemins fautifs sans « réparer » les données avec un LLM.

Le module de fixtures exporte aussi `fixtureCategories: Category[]`, `siteFixture(): SiteConfig`, `publicProjectFixture(): PublicProject`, `showcaseFixtureProps()` et `mediaProject(): PublicProject`. Le catalogue de tests contient quatre projets visibles (`example-audio`, `example-port`, `example-web`, `example-hardware`) et un masqué `hidden-canary`. Les trois premiers sont Featured dans cet ordre. `example-audio` appartient à `audio`, avec description française « Exemple audio » ; les autres permettent de vérifier OR, dates égales et absence de résultat. `siteFixture()` utilise EN, mode production, base `/` et origine `https://example.test`. `showcaseFixtureProps()` renvoie exactement les props T5 depuis le catalogue assaini. `mediaProject()` est complété en T8 avec vidéo et capture libellée `Show screenshot 1`/alt `Full example window`.
- [ ] **Step 5 — Commit.** `feat: validate bilingual project catalogue`.

## T3 — Frontière de publication et médias sélectionnés

**Files:** créer `scripts/publish-catalogue.ts`, `scripts/media-manifest.ts`, `scripts/build.ts`, `scripts/audit-dist.ts`, `tests/unit/publication.test.ts`, `tests/build/privacy.test.ts`, `content/media/` ; modifier `astro.config.mjs`, scripts npm et `.gitignore`.

**Interfaces:** `publishCatalogue(catalogue: Catalogue): PublishedCatalogue` ; `collectMedia(projects: PublicProject[]): string[]` ; `resolveLocalMedia(root: string, logicalPath: string): Promise<string>` ; `auditDist(dir: string, forbidden: string[]): Promise<void>`. Les propriétés non déclarées ne sont jamais recopiées.

- [ ] **Step 1 — Écrire le test rouge de non-publication.**

```ts
import { expect, it } from 'vitest';
import { publishCatalogue } from '../../scripts/publish-catalogue';
import { minimalProject, fixtureCategories } from '../fixtures/catalogue';
it('retire le projet masqué et le lien du dépôt privé', () => {
  const hidden = minimalProject({ id: 'hidden-canary', name: 'HIDDEN_SENTINEL', hidden: true });
  const visible = minimalProject({ repositoryVisibility: 'private', repositoryUrl: 'https://example.test/private-source' });
  const result = publishCatalogue({ categories: fixtureCategories, projects: [hidden, visible] });
  expect(JSON.stringify(result)).not.toContain('HIDDEN_SENTINEL');
  expect(JSON.stringify(result)).not.toContain('private-source');
  expect(result.summaries).toHaveLength(1);
});
```

- [ ] **Step 2 — Vérifier l'échec ciblé.** `npm run test:unit -- tests/unit/publication.test.ts`.
- [ ] **Step 3 — Réaliser l'export avant Astro.** Filtrer les projets masqués ; projeter explicitement les champs autorisés ; retirer `repositoryUrl` pour `private` ; ne conserver que les catégories utilisées. Construire les résumés et détails séparés. Résoudre les médias sous `content/media/` avec `realpath`, refuser les symlinks sortants et copier seulement la liste blanche. `.generated/public/` devient `publicDir` ; ne jamais placer les brouillons dans le `public/` habituel. [R1]

```text
validation → génération dans un dossier temporaire → remplacement .generated
          → astro build → audit de dist → succès de publication
```

`npm run build` appelle `tsx scripts/build.ts` : il nettoie les exports périmés, valide, prépare puis lance Astro et l'audit. Le sous-processus conserve le code de sortie ; s'il est appelé depuis npm, utiliser `process.execPath` avec `process.env.npm_execpath` pour éviter les scripts shell spécifiques à Windows. Ne copier aucun média externe et ne télécharger aucun original implicitement. Les fichiers absents référencés par un projet publié bloquent le build.

- [ ] **Step 4 — Tester aussi le disque.** Créer dès cette tâche les images WebP de test dans `tests/fixtures/media/example/`, avant les builds T5 ; elles sont synthétiques et non confidentielles. Le flag `--fixture` charge exclusivement le catalogue de tests et cette racine média ; sans ce flag, utiliser uniquement `src/data/projects.ts` et `content/media/`. Les endpoints et scripts ne doivent pas mélanger ces sources. Les options `--mode`, `--origin` et `--base` sont acceptées dès le script de build initial, puis durcies en T13. Construire un catalogue de fixtures avec poster masqué distinct, puis vérifier l'absence de son chemin et de son contenu dans tous les HTML/JSON/JS et ressources exportées, y compris après un second build où un ancien projet devient masqué. Contrôler également qu'une catégorie uniquement masquée disparaît. `npm run test:unit -- tests/unit/publication.test.ts`, build fixture et `npm run test:build -- tests/build/privacy.test.ts`.
- [ ] **Step 5 — Commit.** `feat: publish only approved catalogue data and media`.

## T4 — Langues, sélection et URL comme fonctions pures

**Files:** créer `src/domain/locale.ts`, `src/domain/gallery.ts`, `src/domain/routes.ts`, `src/i18n/messages.ts`, `tests/unit/gallery.test.ts`, `tests/unit/routes.test.ts`, `tests/unit/locale.test.ts`.

**Interfaces:** `detectLocale(explicit: Locale | null, saved: string | null, browser: readonly string[]): Locale` ; `selectProjects(projects: readonly ProjectSummary[], state: GalleryState): ProjectSummary[]` ; `sortCategories(categories: readonly Category[], locale: Locale): Category[]` ; `parseRoute(url: URL, base: string, categoryIds: readonly string[]): RouteState | null` ; `formatRoute(route: RouteState, base: string): string` ; `assetUrl(src: string, base: string): string`.

- [ ] **Step 1 — Tests rouges de détection et normalisation.**

```ts
import { expect, it } from 'vitest';
import { detectLocale } from '../../src/domain/locale';
import { formatRoute } from '../../src/domain/routes';
it('privilégie une langue explicite', () => {
  expect(detectLocale('en', 'fr', ['fr-CA'])).toBe('en');
  expect(detectLocale(null, null, ['de-DE', 'fr-CA'])).toBe('fr');
  expect(detectLocale(null, null, ['de-DE'])).toBe('en');
});
it('omet le tri par défaut et trie les catégories', () => {
  const path = formatRoute({ locale: 'fr', projectId: null, categories: ['windows', 'audio', 'audio'], sort: 'updated', q: '' }, '/shelf/');
  const url = new URL(path, 'https://example.test');
  expect(url.pathname).toBe('/shelf/fr/');
  expect(url.searchParams.get('categories')).toBe('audio,windows');
  expect(url.searchParams.has('sort')).toBe(false);
});
```

- [ ] **Step 2 — Observer le rouge.** `npm run test:unit -- tests/unit/locale.test.ts tests/unit/routes.test.ts tests/unit/gallery.test.ts`.
- [ ] **Step 3 — Implémenter sans accès au navigateur.** Utiliser `URLSearchParams`, tri stable des identifiants, paramètres vides omis, tri invalide remplacé par `updated`, catégories inconnues ignorées. Retourner `null` pour une route non reconnue plutôt que la transformer en accueil. Rechercher chaque mot dans l'index des deux langues après normalisation casse/accents. Les catégories se combinent en OR puis en AND avec la recherche. Tri : date choisie décroissante, autre date décroissante, id croissant. Libellés de filtres avec `Intl.Collator(locale)` ; dates avec UTC pour éviter un changement de jour selon le fuseau.

```ts
export const normalizeSearch = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
```

- [ ] **Step 4 — Couvrir les combinaisons.** Ajouter fixtures de dates égales, mots répartis entre champs, accents, catégorie présente dans une seule langue, préfixe encodé et URL projet portant une recherche. Tester `parseRoute(formatRoute(...))`, `fr-CA`, `en-US`, préférence mémorisée invalide et liste de préférences vide.
- [ ] **Step 5 — Commit.** `feat: model bilingual gallery filters and shareable routes`.

## T5 — Pages pré-générées, fiche unique et première couche SEO

**Files:** créer `src/components/ShowcaseApp.tsx`, `SiteHeader.tsx`, `ProjectCard.tsx`, `ProjectGrid.tsx`, `ProjectDetails.tsx`, `SeoHead.astro`, `src/seo/model.ts`, les routes `[lang]/index.astro`, `[lang]/projects/[id].astro`, `data/projects/[id].json.ts`, `tests/build/pages.test.ts`, `tests/e2e/no-js.spec.ts` ; modifier l'accueil racine.

**Interfaces:** `buildSeo(config: SiteConfig, route: RouteState, project?: PublicProject): SeoModel`. `ShowcaseApp` reçoit `{ config, categories, summaries, initialRoute, initialProject? }`. `ProjectDetails` reçoit `{ project: PublicProject, locale: Locale, base: string }`. `ProjectCard` reçoit `{ project: ProjectSummary, route: RouteState, base: string, variant: 'grid' | 'featured' }`.

- [ ] **Step 1 — Écrire le test rouge du HTML sans client.**

```ts
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { expect, it } from 'vitest';
it('exporte la fiche française et son adresse de référence', async () => {
  const $ = load(await readFile('dist/fr/projects/example-audio/index.html', 'utf8'));
  expect($('html').attr('lang')).toBe('fr');
  expect($('article[data-project-id="example-audio"]').text()).toContain('Exemple audio');
  expect($('link[rel="canonical"]').attr('href')).toBe('https://example.test/fr/projects/example-audio/');
  expect($('article').closest('[hidden]').length).toBe(0);
});
```

- [ ] **Step 2 — Construire avec les fixtures et constater les routes absentes.** `npm run build -- --fixture --mode production --origin https://example.test` puis `npm run test:build -- tests/build/pages.test.ts`.
- [ ] **Step 3 — Produire les routes et le rendu commun.** `getStaticPaths()` génère les deux langues pour les projets publiés ; les endpoints JSON sont pré-générés. Utiliser `<ShowcaseApp client:load ... />`, jamais `client:only`. Le rendu serveur montre un article normal pour une arrivée directe ; T7 l'améliorera en popin après hydratation. La galerie SSR contient des liens vers tous les projets, même ceux hors Featured. [R2, R3, R4]

```astro
---
// Dans [lang]/projects/[id].astro, props issues du catalogue assaini.
const { config, categories, summaries, initialRoute, project } = Astro.props;
const seo = buildSeo(config, initialRoute, project);
---
<html lang={initialRoute.locale}>
  <head><SeoHead model={seo} /></head>
  <body>
    <ShowcaseApp client:load config={config} categories={categories}
      summaries={summaries} initialRoute={initialRoute} initialProject={project} />
  </body>
</html>
```

La route `/` contient l'accueil anglais, deux liens linguistiques et canonical `/en/`. Ajouter titre, description et langue propres à chaque page dès cette tâche. En build statique, les query strings ne sont pas connues à la génération : la page propre reste la source HTML et le client lit les paramètres après montage. Échapper les textes ; ne pas interpréter le contenu du catalogue comme HTML.

- [ ] **Step 4 — Vérifier.** Tests build puis navigateur sans JavaScript : accueils, fiches, liens EN/FR et lecture vidéo manuelle restent accessibles ; recherche/tri/rotation sans client ne sont pas des commandes factices. Une route inconnue n'est pas générée. Le JSON ne contient que le projet demandé.
- [ ] **Step 5 — Commit.** `feat: prerender localized project pages with shared content`.

## T6 — Galerie interactive et thème approuvé

**Files:** créer `src/components/ProjectFilters.tsx`, `src/styles/tokens.css`, `global.css`, `components.css`, `tests/components/grid.test.tsx`, `tests/e2e/grid.spec.ts` ; modifier `ShowcaseApp.tsx`, `ProjectGrid.tsx`, `ProjectCard.tsx`.

**Interfaces:** `ProjectFilters` reçoit `{ categories, locale, state, onChange: (next: GalleryState) => void }`. L'état est détenu dans `ShowcaseApp` ; aucune carte ne détient sa propre copie du catalogue. `ProjectGrid` expose un compteur et un état vide localisés.

- [ ] **Step 1 — Test rouge de la recherche combinée.**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import ShowcaseApp from '../../src/components/ShowcaseApp';
import { showcaseFixtureProps } from '../fixtures/catalogue';
it('combine catégorie et recherche et conserve les commandes', () => {
  render(<ShowcaseApp {...showcaseFixtureProps()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Audio' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'introuvable' } });
  expect(screen.getByRole('status')).toHaveTextContent('0');
  expect(screen.getByRole('searchbox')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Reset filters' })).toBeVisible();
});
```

- [ ] **Step 2 — Observer le rouge.** `npm run test:unit -- tests/components/grid.test.tsx`. La configuration jsdom et les extensions jest-dom viennent de T1 ; compléter `showcaseFixtureProps()` en T2 avec un catalogue publié et `locale: 'en'`.
- [ ] **Step 3 — Rendre les contrôles et appliquer les jetons approuvés.** Catégories en cases à cocher stylées, recherche contrôlée sans bouton obligatoire, sélecteur de tri, compteur `role="status"` non bavard et réinitialisation. Recalcul par `selectProjects` sans duplication de logique. Utiliser une seule carte en variante de disposition. Appliquer les valeurs de T0, avec l'accent global ci-dessous.

```css
:root { color-scheme: dark; --accent: #4DA3FF; }
.project-grid { display: grid; grid-template-columns: 1fr; }
.card-media { aspect-ratio: 16 / 9; overflow: hidden; }
@media (min-width: 640px) { .project-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .project-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1280px) { .project-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
```

- [ ] **Step 4 — Vérifier au navigateur.** Quatre colonnes à 1440 pixels, puis 3/2/1 aux largeurs correspondantes ; 16:9 stable ; textes longs FR sans débordement ; catégories dynamiques, ordre alphabétique local et aucun filtre supprimé parce que le résultat est vide. Commandes : test composant puis `npm run test:e2e -- tests/e2e/grid.spec.ts`.
- [ ] **Step 5 — Commit.** `feat: add searchable responsive project gallery`.

## T7 — Historique, liens profonds et popin accessible

**Files:** créer `src/navigation/history.ts`, `details-loader.ts`, `useShowcase.ts`, `src/components/ProjectModal.tsx`, `src/seo/sync-head.ts`, `tests/unit/history.test.ts`, `tests/e2e/navigation.spec.ts` ; modifier `ShowcaseApp.tsx`, `SiteHeader.tsx`.

**Interfaces:** `loadProject(id: string, base: string, signal: AbortSignal): Promise<PublicProject>` ; `createNavigation(win: Window, config: SiteConfig, categories: readonly string[]): NavigationController`. Contrat du contrôleur : `getRoute(): RouteState`, `subscribe(listener: () => void): () => void`, `editSearch(q: string): void`, `endSearchEdit(): void`, `setGallery(state: GalleryState): void`, `openProject(id: string, triggerId: string): void`, `closeProject(): void`, `switchLocale(locale: Locale): void`, `dispose(): void`. `syncHead(model: SeoModel): void` utilise exclusivement le modèle de T5.

- [ ] **Step 1 — Écrire le parcours rouge.**

```ts
import { test, expect } from '@playwright/test';
test('Retour ferme la fiche sans perdre la recherche', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('searchbox').fill('audio');
  await page.locator('[data-project-link="example-audio"]').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/projects\/example-audio\//);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveValue('audio');
  await page.goForward();
  await expect(page.getByRole('dialog')).toBeVisible();
});
```

- [ ] **Step 2 — Observer l'échec.** `npm run test:e2e -- tests/e2e/navigation.spec.ts` : pas encore de dialog/historique applicatif.
- [ ] **Step 3 — Implémenter le contrôleur puis la présentation.** Stocker dans `history.state` un marqueur propriétaire, id d'entrée, origine de l'ouverture, langue, galerie, scroll et id du déclencheur. Le premier changement d'une session de recherche pousse une entrée ; les caractères suivants la remplacent. Blur, Entrée, catégorie, tri, ouverture et changement de langue terminent la session ; ne pas créer d'entrée à chaque lettre. `popstate` relit l'URL, sans nouvelle écriture.

```text
open from gallery : replace current entry with scroll/focus → push project entry
close owned entry : back only when the immediately previous gallery is known
close direct entry: replace with localized gallery, keep criteria
switch language   : replace current route, keep criteria/project, store preference
                    invalidate back-close shortcut if previous gallery has old locale
```

Après hydratation seulement, remplacer la présentation article par un `<dialog>` ouvert via `showModal()`, sans cacher le fallback avant que le client soit prêt. Garder `ProjectDetails` commun. Focus initial sur son titre (`tabIndex=-1`), arrière-plan inerte, Échap/croix équivalents, scroll verrouillé et restauré, focus rendu au déclencheur ou au titre de galerie. Le sélecteur EN/FR de la fiche reste dans la zone accessible du dialog. [R7]

Intercepter seulement le clic principal non modifié sur les routes internes : Ctrl/Cmd, bouton central, cible nouvel onglet et téléchargement conservent leur comportement natif. Valider le JSON de détail contre le contrat public et vérifier son id avant affichage. Annuler le chargement précédent et ignorer toute réponse tardive ; sur erreur JSON, présenter un lien vers la page complète. La détection sur `/` se fait une seule fois après montage, en `replace`, avec accès au stockage protégé par `try/catch`. Les routes déjà localisées ne sont pas redirigées.

- [ ] **Step 4 — Vérifier les cas difficiles.** Tests unitaires du nombre d'entrées et E2E : rechargement avec critères, fermeture arrivée externe, langue changée dans une fiche, navigation rapide A→B, échec réseau, focus, scroll, Retour/Suivant et ouverture nouvel onglet. Valider aussi les métadonnées après navigation client et absence d'erreur d'hydratation.
- [ ] **Step 5 — Commit.** `feat: synchronize project dialogs with browser history`.

## T8 — Galerie média de fiche, vidéo en premier

**Files:** créer `src/components/MediaCarousel.tsx`, `src/media/playback.ts`, `tests/components/media-carousel.test.tsx`, `tests/e2e/media-carousel.spec.ts`, `tests/fixtures/media/` ; modifier `ProjectDetails.tsx`.

**Interfaces:** `orderMedia(project: PublicProject): (ImageMedia | VideoMedia)[]` ; `tryPlay(video: HTMLVideoElement): Promise<'playing' | 'blocked'>` ; `MediaCarousel` reçoit `{ project, locale, base, allowAutoplay }`. Réordonner uniquement l'affichage pour mettre la première vidéo en tête en préservant l'ordre relatif des autres médias.

- [ ] **Step 1 — Écrire le test rouge du cycle image/vidéo.**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import MediaCarousel from '../../src/components/MediaCarousel';
import { mediaProject } from '../fixtures/catalogue';
it('affiche la vidéo puis une capture sans recadrer la fiche', () => {
  const { container } = render(<MediaCarousel project={mediaProject()} locale="en" base="/" allowAutoplay={false} />);
  expect(container.querySelector('video')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show screenshot 1' }));
  expect(screen.getByAltText('Full example window')).toBeVisible();
});
```

- [ ] **Step 2 — Exécuter le test rouge.** `npm run test:unit -- tests/components/media-carousel.test.tsx`. Mocker `play`/`pause` dans jsdom sans prétendre valider un codec.
- [ ] **Step 3 — Implémenter sélection et contrôle du lecteur.** Première vidéo ou première image ou poster ; HTML vidéo avec poster, `controls`, `muted`, `playsInline` et `preload="none"`, mais aucun attribut autoplay SSR. Après montage et vérification des préférences, `tryPlay` traite la Promise rejetée. Pause avant changement ; mémoriser la position par média dans cette ouverture ; revenir à zéro si une vidéo terminée est relancée. Pas de passage automatique au média suivant.

```ts
export async function tryPlay(video: HTMLVideoElement): Promise<'playing' | 'blocked'> {
  try { await video.play(); return 'playing'; }
  catch { return 'blocked'; }
}
```

Images en `object-fit: contain`, dimensions réservées, miniatures avec nom accessible et indication de sélection ; flèches et défilement tactile sans obligation de swipe. Chaque ouverture recrée la session avec premier média et son coupé. À la fermeture, pause puis détachement des sources. Inclure pistes VTT ou transcription lorsqu'une narration utile existe.

- [ ] **Step 4 — Tester au navigateur avec vrais médias de test.** Préparer et commiter de petites fixtures clairement synthétiques : MP4/H.264 court, image portrait, image paysage et sous-titre VTT. Vérifier autoplay muet accepté ou refusé, son activé manuellement puis réouverture muette, position conservée, fin sans rotation de vignettes et arrêt après fermeture. Tester réellement le MP4 dans les navigateurs disponibles ; un mock DOM n'est pas une validation de lecture.
- [ ] **Step 5 — Commit.** `feat: add Steam-style project media gallery`.

## T9 — Arbitrage des lecteurs et aperçu au survol

**Files:** créer `src/media/coordinator.ts`, `src/media/usePreview.ts`, `tests/unit/coordinator.test.ts`, `tests/e2e/preview.spec.ts` ; modifier `ProjectCard.tsx`, `MediaCarousel.tsx`, `ShowcaseApp.tsx`.

**Interfaces:** `createMediaCoordinator(): MediaCoordinator`. `MediaCoordinator.request(owner: string, priority: number, pause: () => void): MediaLease` retourne `{ isGranted(): boolean; release(): void }` ; `subscribe(listener: () => void): () => void` signale les changements de propriétaire ; `suspendAll(): void` interrompt les propriétaires actifs. Une demande moins prioritaire reste en attente et ne doit pas lancer de vidéo ; `release()` est idempotent. Le lecteur reprend uniquement si son bail redevient autorisé et si sa propre politique de pause le permet. Priorités : détail 30, survol 20, Featured 10. Une perte de priorité ne constitue jamais une autorisation de relancer un lecteur volontairement arrêté.

- [ ] **Step 1 — Test rouge de priorité.**

```ts
import { expect, it, vi } from 'vitest';
import { createMediaCoordinator } from '../../src/media/coordinator';
it('suspend Featured quand un aperçu devient prioritaire', () => {
  const coordinator = createMediaCoordinator();
  const pauseFeatured = vi.fn();
  coordinator.request('featured', 10, pauseFeatured);
  coordinator.request('hover:example-audio', 20, vi.fn());
  expect(pauseFeatured).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2 — Observer le rouge.** `npm run test:unit -- tests/unit/coordinator.test.ts`.
- [ ] **Step 3 — Câbler la politique de lecture.** Une seule instance de coordination par page, pas une par carte. `matchMedia('(hover: hover) and (pointer: fine)')` autorise les aperçus desktop ; tactile garde le poster. Attacher la source vidéo seulement au survol autorisé, tenter lecture muette en boucle ; sortie = pause, retrait de source, retour au poster. Réduction des animations = pas de lecture décorative automatique. Les aperçus ne capturent jamais le clic qui ouvre la fiche.

```text
detail open → request(30), stop hover, suspend Featured
hover enter → request(20), attach source, muted play with loop
hover leave → pause, remove source, release; show poster
tab hidden  → suspendAll; do not infer a user resume from tab visibility
```

- [ ] **Step 4 — Vérifier réseau et arrêt.** `npm run test:e2e -- tests/e2e/preview.spec.ts` : pas de requête pour toutes les previews initiales ; une carte jouée, sortie arrêtée, appareil tactile ouvrant sa fiche, mode reduced-motion statique, ouverture de fiche interrompant la preview. Ajouter tests de release répétée et démontage pour éliminer les fuites d'écouteurs.
- [ ] **Step 5 — Commit.** `feat: coordinate video previews and playback priority`.

## T10 — Machine d'état du carrousel Featured

**Files:** créer `src/featured/machine.ts`, `tests/unit/featured.test.ts`.

**Interfaces:** `visibleFeaturedIds(ids: readonly string[], active: number): string[]` ; `createFeaturedState(count: number, reducedMotion: boolean): FeaturedState` ; `reduceFeatured(state: FeaturedState, event: FeaturedEvent): FeaturedState`.

```ts
export type FeaturedState = {
  count: number; active: number; userPaused: boolean;
  hover: boolean; suspended: boolean; ended: boolean;
};
export type FeaturedEvent =
  | { type: 'ended' } | { type: 'pause' } | { type: 'resume' }
  | { type: 'hover'; value: boolean } | { type: 'suspend'; value: boolean }
  | { type: 'manual'; index: number } | { type: 'keyboard-focus' };
```

- [ ] **Step 1 — Test rouge de fin de vidéo sous la souris.**

```ts
import { expect, it } from 'vitest';
import { createFeaturedState, reduceFeatured, visibleFeaturedIds } from '../../src/featured/machine';
it('attend la sortie du survol avant de changer de carte', () => {
  let state = createFeaturedState(4, false);
  state = reduceFeatured(state, { type: 'hover', value: true });
  state = reduceFeatured(state, { type: 'ended' });
  expect(state.active).toBe(0);
  state = reduceFeatured(state, { type: 'hover', value: false });
  expect(state.active).toBe(1);
  expect(visibleFeaturedIds(['a', 'b'], 0)).toEqual(['a', 'b']);
});
```

- [ ] **Step 2 — Exécuter le rouge.** `npm run test:unit -- tests/unit/featured.test.ts`.
- [ ] **Step 3 — Implémenter les transitions pures.** `ended` avance seulement si count>1 et aucune pause/suspension/survol ; sinon marque une fin en attente. Sortir d'une suspension ne supprime pas `userPaused`. Navigation manuelle/focus clavier positionnent `userPaused=true` ; seule reprise explicite l'annule. Pour zéro ou un projet, aucune rotation ; deux projets ne sont pas dupliqués. Tri initial : `featuredOrder` croissant, absents à la fin, puis `updatedAt` décroissant et id stable.

```ts
const canAdvance = (s: FeaturedState) =>
  s.count > 1 && !s.userPaused && !s.hover && !s.suspended;
```

- [ ] **Step 4 — Tester toutes les transitions.** Cas 0/1/2/5, retour fin→début, ordre éditorial égal ou absent, clavier sans reprise automatique, pause volontaire conservée après fermeture de fiche, reduced-motion initial et fin en attente après survol. Aucune temporisation réelle dans les tests du reducer.
- [ ] **Step 5 — Commit.** `feat: model accessible Featured rotation`.

## T11 — Featured vidéo, temporisations et repli

**Files:** créer `src/components/FeaturedCarousel.tsx`, `tests/components/featured.test.tsx`, `tests/e2e/featured.spec.ts` ; modifier `ShowcaseApp.tsx`, `components.css`.

**Interfaces:** `FeaturedCarousel` reçoit `{ projects: ProjectSummary[], route, base, coordinator }`. Le composant consomme la machine T10 et la carte T5 ; ses boutons secondaires « Lire cet aperçu » sont frères du lien, jamais des boutons imbriqués dans celui-ci.

- [ ] **Step 1 — Parcours rouge fin→suivant.**

```ts
import { test, expect } from '@playwright/test';
test('fait avancer Featured à la fin de la preview', async ({ page }) => {
  await page.goto('/en/');
  const featured = page.locator('[data-featured]');
  await expect(featured.locator('[data-active-project]')).toHaveAttribute('data-active-project', 'example-audio');
  await featured.locator('video').evaluate((node: HTMLVideoElement) => node.dispatchEvent(new Event('ended')));
  await expect(featured.locator('[data-active-project]')).toHaveAttribute('data-active-project', 'example-port');
});
```

- [ ] **Step 2 — Observer le rouge.** `npm run test:e2e -- tests/e2e/featured.spec.ts`. Le test d'événement valide la transition, pas la lecture effective du codec ; conserver le contrôle réel de T8.
- [ ] **Step 3 — Rendre un actif et deux posters.** Preview active muette, `playsInline`, **sans loop**. Événement `ended` vers machine ; progression selon `currentTime/duration`. Sans vidéo, délai de poster 6000 ms surchargeable. Démarrage ou absence de progression bloqué pendant 8000 ms = repli poster avec temporisation ; ne pas cumuler timeout et lecteur réussi. Ce délai technique est borné et isolé dans une constante.

```ts
const DEFAULT_POSTER_MS = 6000;
const MEDIA_STALL_MS = 8000;
```

Pause et reprise doivent conserver le temps restant du poster ; un onglet caché ne « rattrape » pas dix rotations au retour. Suspendre via visibilité de page, IntersectionObserver, fiche ouverte et coordinateur T9. Agréger ces raisons avant d'envoyer `suspend` : la disparition d'une seule raison ne doit pas annuler les autres. Retirer les écouteurs de l'ancien média et ignorer sa fin tardive après un changement manuel. Survol bloque l'avancement mais peut laisser la preview finir ; clavier et navigation manuelle exigent reprise explicite. Afficher compteur compact et commande de rotation accessible. Sur mobile, un seul projet, flèches et swipe horizontal sans bloquer le défilement vertical. [R6, R8]

- [ ] **Step 4 — Tester les replis avec horloge contrôlée.** Vidéo absente, `play()` rejeté, erreur réseau, vidéo qui stagne, vidéo de durée invalide, pause et reprise, section hors écran, clic poster vers fiche et commande d'aperçu vers sélection. Vérifier 0/1/2 projets sans duplicata ni commandes inutiles et absence de rotation sous focus clavier.
- [ ] **Step 5 — Commit.** `feat: render video-driven Featured carousel with fallbacks`.

## T12 — SEO complet et cohérence HTML/client

**Files:** créer `src/seo/structured-data.ts`, `sitemap.ts`, `src/pages/sitemap.xml.ts`, `robots.txt.ts`, `tests/unit/seo.test.ts`, `tests/build/seo.test.ts` ; modifier `model.ts`, `sync-head.ts`, `SeoHead.astro` et la page 404.

**Interfaces:** `buildStructuredData(project: PublicProject, locale: Locale, config: SiteConfig): Record<string, unknown>[]` ; `buildSitemap(config: SiteConfig, projects: readonly PublicProject[]): string`. Les modèles se calculent à partir du même contenu que les fiches ; les pages sans indexation n'ont pas d'alternates pointant vers une version exclue.

- [ ] **Step 1 — Test rouge canonical et langues.**

```ts
import { expect, it } from 'vitest';
import { buildSeo } from '../../src/seo/model';
import { siteFixture, publicProjectFixture } from '../fixtures/catalogue';
it('garde une canonical française propre malgré les filtres', () => {
  const meta = buildSeo(siteFixture(), { locale: 'fr', projectId: 'example-audio', categories: ['audio'], q: 'x', sort: 'created' }, publicProjectFixture());
  expect(meta.canonical).toBe('https://example.test/fr/projects/example-audio/');
  expect(meta.alternates).toContainEqual({ lang: 'x-default', href: 'https://example.test/en/projects/example-audio/' });
});
```

- [ ] **Step 2 — Exécuter la matrice rouge complémentaire.** `npm run test:unit -- tests/unit/seo.test.ts` : Open Graph, sitemap, noindex et données structurées encore absents doivent échouer.
- [ ] **Step 3 — Compléter le générateur commun.** Canonical absolue autoréférencée sans critères ; hreflang en/fr réciproques plus x-default anglais ; `html lang`, meta description, Open Graph localisé, image dédiée ou poster avec URL absolue. `syncHead` remplace les balises possédées par l'application, n'accumule pas plusieurs canonicals et retire les anciennes données structurées à la fermeture de fiche. [R9]

Sitemap : seulement accueils EN/FR et projets indexables, sans `/`, query, masqués ni 404. `lastmod` utilise uniquement `pageUpdatedAt[locale]` validée ; sinon il est omis. Prévisualisation : noindex initial partout et aucun sitemap de production. Fiche non indexable : noindex initial et aucune règle robots qui empêcherait de le lire.

JSON-LD : `SoftwareApplication` seulement si `application` est renseigné ; pas de prix/avis/note inventés. `VideoObject` seulement avec titre traduit, vraie `uploadDate`, poster et `contentUrl` vidéo stable ; `durationSeconds` converti en durée ISO lorsqu'il existe. Échapper `<` en `\u003c` dans les blocs JSON pour éviter une fermeture de script injectée. Les données structurées ne promettent aucun résultat enrichi.

- [ ] **Step 4 — Auditer la sortie.** Parser tous les HTML construits et le XML, contrôler titres et descriptions distincts, une canonical, liens absolus, préfixe respecté, hreflang réciproques, noindex des previews et JSON-LD correspondant au contenu. Tester chaînes `</script>`, dates vidéo manquantes et `indexable: false`. Vérifier les mêmes métadonnées après ouverture/fermeture/changement de langue en client.
- [ ] **Step 5 — Commit.** `feat: complete bilingual SEO and static sitemap`.

## T13 — Portabilité des builds et vraie 404

**Files:** créer `scripts/verify-deploy.ts`, `scripts/package-static.ts`, `tests/build/deployment.test.ts`, `tests/e2e/deployment.spec.ts`, `docs/deployment.md` ; modifier `scripts/build.ts`, `src/config/site.ts`, `README.md`.

**Interfaces:** options CLI de build `--mode preview|production`, `--origin <https-origin>`, `--base <prefix>`, `--fixture`. Les flags priment sur les variables ; `.env` reste ignoré. `npm run build` sans argument produit une prévisualisation non indexable. `verify-deploy` reçoit une URL explicite, ne publie rien.

- [ ] **Step 1 — Test rouge d'origine obligatoire.**

```ts
import { expect, it } from 'vitest';
import { loadSiteConfig } from '../../src/config/site';
it('ne construit pas une production avec une origine supposée', () => {
  expect(() => loadSiteConfig({ SITE_MODE: 'production' })).toThrow();
});
```

- [ ] **Step 2 — Observer l'échec de validation/configuration.** `npm run test:build -- tests/build/deployment.test.ts`.
- [ ] **Step 3 — Paramétrer l'export et les vérifications.** Origine HTTPS sans chemin/identifiants/query ; préfixe normalisé séparément ; sortie sans adaptateur serveur. L'origine fictive n'est admise en mode production que pour les fixtures de test, jamais pour un build publiable. Prévoir un paquet statique distinct, pas de publication automatique ni de suppression de fichiers distants.

```sh
npm run build -- --fixture --mode production --origin https://example.test --base /
npm run build -- --fixture --mode production --origin https://example.test --base /project-shelf/
```

Le fichier `dist/index.html` reste à la racine du paquet à monter sous le préfixe configuré : ne pas doubler celui-ci dans le disque et dans le serveur. Tester tous les chemins locaux, JSON, images, sous-titres et URL SEO. OVH/Vercel ne doivent pas réécrire globalement les routes inconnues vers un accueil 200. Pour GitHub Pages, documenter séparément la publication gérée par le service et l'absence de jobs de développement lancés ici ; une interdiction totale d'Actions exclut cette cible, conformément à la spécification.

`robots.txt` ne peut être contrôlé à l'échelle de l'origine qu'à sa racine ; ne pas prétendre qu'un `/project-shelf/robots.txt` la remplace. Un contrôle de déploiement vérifie réponse 200 des routes connues, 404 d'un projet inconnu, MIME des médias, cache et absence de noindex en production autorisée.

- [ ] **Step 4 — Vérifier les deux montages localement.** Servir chaque build au chemin correct ; parcourir un projet directement, recharger, changer de langue et fermer la fiche. La 404 est mesurée par le statut HTTP, pas par le texte affiché. Les essais sur hébergement réel restent non cochés jusqu'à choix de la cible et autorisation de publication.
- [ ] **Step 5 — Commit.** `feat: verify portable static deployments and HTTP errors`.

## T14 — Alimentation par LLM, documentation et contrôle éditorial

**Files:** créer `docs/content-authoring.md`, `docs/project-entry-template.md`, `tests/unit/content-contract.test.ts` ; modifier `scripts/validate-catalogue.ts` et `README.md`.

**Interfaces:** `npm run validate:catalogue` valide le fichier de production sans extraction distante. La documentation décrit les exports exacts de T2 et tous les champs facultatifs ; elle n'ajoute pas un deuxième schéma concurrent.

- [ ] **Step 1 — Test rouge du contrat éditorial.**

```ts
import { expect, it } from 'vitest';
import { parseCatalogue } from '../../src/domain/schema';
import { minimalProject, fixtureCategories } from '../fixtures/catalogue';
it('n accepte pas de provenance interne ajoutée au projet publiable', () => {
  const project = { ...minimalProject(), internalNotes: 'PRIVATE_NOTE_CANARY' };
  expect(() => parseCatalogue({ categories: fixtureCategories, projects: [project] })).toThrow();
});
```

- [ ] **Step 2 — Vérifier l'échec si le schéma autorise des champs supplémentaires.** Si le test passe déjà grâce à T2, ne pas casser un comportement correct pour fabriquer un rouge : enregistrer ce test comme régression et ajouter le cas de documentation encore manquant.
- [ ] **Step 3 — Documenter le flux réel.** Source autorisée → proposition LLM EN/FR → relecture humaine → validation → build. Pour chaque projet, demander preuves de dates, statut et fonctionnalités ; distinguer roadmap/réalité ; contrôler les droits de publication des médias ; ne pas inventer capture, démo, mesure de performance ou lien. Faire de l'autorisation de publication d'un projet privé une décision éditoriale explicite.

```text
Ajout éditorial : id stable, catégories traduites, dates sourcées,
textes EN/FR, liens honnêtes, poster, preview facultative,
galerie ordonnée, indexable/hidden, puis validation locale.
```

Expliquer : mise à jour réelle du projet vs modification de fiche ; aucune auto-date au build ; source privée != projet masqué ; ressources confidentielles hors dépôt public et hors historique Git. Les médias synthétiques de test ne sont jamais le catalogue de production. Les textes du README restent bilingues utiles, pas une seconde copie du catalogue.

- [ ] **Step 4 — Vérifier le guide contre le schéma.** Valider l'exemple documentaire par le même parseur, vérifier qu'aucun champ du modèle n'est documenté sous un autre nom, tester `repositoryVisibility: private` avec fiche indexable et vérifier la sortie. L'import de vrais projets est séparé de l'implémentation et exige les sources et médias autorisés.
- [ ] **Step 5 — Commit.** `docs: define reviewed LLM-assisted catalogue workflow`.

## T15 — Recette croisée, accessibilité et budgets médias

**Files:** créer `tests/e2e/accessibility.spec.ts`, `tests/e2e/performance.spec.ts`, `tests/e2e/resilience.spec.ts`, `scripts/measure-output.ts`, `docs/verification.md` ; finaliser `playwright.config.ts`, scripts npm et la matrice ci-dessous.

**Interfaces:** `npm run verify` exécute validation, contrôle TypeScript, tests unitaires/composants, build fixture, tests statiques et E2E. `npm run measure:output` relève poids du JS et des médias sans transmettre de télémétrie utilisateur. Le rapport indique environnement, commit, commandes, résultat réel et limites.

- [ ] **Step 1 — Écrire le contrôle rouge de chargement réseau.**

```ts
import { test, expect } from '@playwright/test';
test('ne récupère aucune preview en mode mouvement réduit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const videos: string[] = [];
  page.on('request', request => { if (/\.mp4(?:\?|$)/.test(request.url())) videos.push(request.url()); });
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  expect(videos).toEqual([]);
});
```

- [ ] **Step 2 — Exécuter la suite ciblée et relever les écarts.** `npm run test:e2e -- tests/e2e/performance.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/resilience.spec.ts`. Les tests déjà verts deviennent régressions ; toute nouvelle correction reproduit d'abord son défaut.
- [ ] **Step 3 — Fermer les écarts sans changer le produit.** Tester uniquement les moteurs disponibles puis consigner les manquants. Playwright Chromium/Firefox/WebKit, mobile tactile, clavier seul, sans JS, stockage indisponible, JS chargé lentement, JSON 404, médias bloqués et réseau ralenti. Ajouter `@axe-core/playwright` comme dépendance de développement si l'audit automatique est retenu ; l'audit ne remplace pas focus/lecture/contraste/zoom manuels.

```text
Vérification clavier : entrée fiche → focus titre → Tab contenu/commandes
→ Shift+Tab contenu → Échap → focus carte déclencheuse.
Vérification autoplay : reduced motion → aucun démarrage décoratif ;
pause volontaire → changement d'onglet → pas de reprise imposée.
```

Mesurer LCP/CLS en laboratoire et réactivité des interactions ; ne pas annoncer une mesure INP terrain à partir d'un score Lighthouse. Objectifs de la spec : LCP <= 2,5 s, INP <= 200 ms, CLS <= 0,1 au 75e percentile réel lorsque les données existent. Rapporter les mesures avec le catalogue et les médias utilisés, pas une garantie avec un catalogue vide. Aucun outil publicitaire n'est ajouté.

- [ ] **Step 4 — Exécuter la recette finale et consigner les preuves.** `npm ci`, `npm run verify`, deux builds préfixés T13. Comparer la maquette approuvée au rendu desktop/mobile ; vérifier les contrastes mesurés, zoom, retour focus, cartes complètes et liens privés absents. iOS réel, URL de production, Search Console, indexation et statistiques restent explicitement « non réalisés » jusqu'à accès/autorisation. WebKit automatisé n'est pas un test d'iPhone réel.
- [ ] **Step 5 — Commit.** `test: verify ProjectShelf acceptance and deployment readiness`. Aucune mise en ligne incluse. Réexaminer les critères non exécutés avant d'annoncer une version terminée.

## Matrice de couverture de la spécification

Les 37 critères ci-dessous sont des obligations de recette, pas des résultats. Chaque ligne doit recevoir une preuve dans `docs/verification.md` à l'exécution.

| Critère | Tâches responsables |
|---|---|
| DATA-01 | T2 |
| DATA-02 | T2 |
| DATA-03 | T3, T15 |
| DATA-04 | T3, T14 |
| GRID-01 | T0, T6 |
| GRID-02 | T6, T8 |
| GRID-03 | T9 |
| FILTER-01 | T4, T6 |
| FILTER-02 | T4, T6 |
| SORT-01 | T4, T6 |
| FEATURED-01 | T10, T11 |
| FEATURED-02 | T10, T11 |
| FEATURED-03 | T11 |
| FEATURED-04 | T7, T11 |
| FEATURED-05 | T9, T10, T11 |
| DETAIL-01 | T5, T7 |
| DETAIL-02 | T8, T9 |
| DETAIL-03 | T8 |
| NAV-01 | T4, T7 |
| NAV-02 | T7 |
| NAV-03 | T7 |
| NAV-04 | T7 |
| I18N-01 | T4, T7 |
| I18N-02 | T4, T7 |
| SEO-01 | T5 |
| SEO-02 | T5, T12 |
| SEO-03 | T12 |
| SEO-04 | T12 |
| SEO-05 | T12, T13 |
| SEO-06 | T12 |
| A11Y-01 | T0, T7, T8, T11, T15 |
| A11Y-02 | T9, T10, T11, T15 |
| PERF-01 | T3, T9, T15 |
| PERF-02 | T8, T9, T11, T15 |
| DEPLOY-01 | T4, T13 |
| DEPLOY-02 | T13 |
| FALLBACK-01 | T5, T7, T15 |

## Relecture du plan avant exécution

Vérifier que le choix des versions compatible avec Node a été consigné à T1, que les interfaces ci-dessus restent identiques dans les tâches et que les fixtures sont séparées du catalogue réel. La maquette T0 doit être validée avant les styles définitifs. Les flux de publication et de métadonnées sont uniques ; ne pas réintroduire de données brutes côté client ou une deuxième fiche « SEO » divergente.

Un correctif technique découvert pendant l'exécution se documente avec son test. Un changement produit contredisant la spec nécessite une validation explicite, pas une modification discrète du plan. La case de commit implique que le diff du commit contient seulement la tâche et la mise à jour de ses cases.

## Références d'implémentation

Documentation primaire vérifiée lors de la rédaction le 6 septembre 2026. Les règles produit proviennent de la spécification ; ces références justifient les mécanismes techniques, pas des performances déjà obtenues.

- **R1 — Configuration Astro (static, base, publicDir).** https://docs.astro.build/en/reference/configuration-reference/
- **R2 — Routage et chemins pré-générés.** https://docs.astro.build/en/guides/routing/
- **R3 — Composants React et hydratation avec HTML initial.** https://docs.astro.build/en/guides/framework-components/
- **R4 — Endpoints statiques.** https://docs.astro.build/en/guides/endpoints/
- **R5 — Tests Astro / Vitest / serveur Playwright.** https://docs.astro.build/en/guides/testing/ ; https://vitest.dev/guide/ ; https://playwright.dev/docs/test-webserver
- **R6 — Contrôle de rotation accessible.** https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
- **R7 — Dialog modal et focus.** https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- **R8 — Autoplay et refus de lecture.** https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- **R9 — Versions localisées et hreflang.** https://developers.google.com/search/docs/specialty/international/localized-versions

Pour canonical, robots, vidéos, sitemap, Core Web Vitals et publication Pages, lire également les références S4 à S23 déjà citées dans la spécification. Une vérification technique actuelle reste obligatoire lorsque l'API ou les conditions d'un hébergement changent.
