// ============================================================================
// ShellSourceContract — Contrôle structurel du socle et des routes SSR
// ----------------------------------------------------------------------------
// Ce fichier vérifie les garde-fous des sources sans dépendre d'Astro installé.
// Les tests de build et de navigateur restent indépendants et obligatoires.
// ============================================================================
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// ----------------------------------------------------------------------------
// Vérifie que la configuration prévoit un export de fichiers, pas un serveur SPA.
// ----------------------------------------------------------------------------
test('configure un export statique et des chemins de répertoire', async function staticConfiguration() {
  // Source de configuration lue sans charger les paquets encore indisponibles.
  const source = await readFile('astro.config.mjs', 'utf8');
  assert.match(source, /output:\s*'static'/);
  assert.match(source, /trailingSlash:\s*'always'/);
  assert.match(source, /format:\s*'directory'/);
  assert.doesNotMatch(source, /adapter:|client:only/);
});

// ----------------------------------------------------------------------------
// Vérifie que le layout délègue langue et métadonnées au modèle SEO de route.
// ----------------------------------------------------------------------------
test('utilise la langue et le SEO de route sans client-only', async function routeDrivenLayout() {
  // Le layout T5 reçoit un modèle SEO explicite et conserve un contenu SSR.
  const layout = await readFile('src/layouts/BaseLayout.astro', 'utf8');
  assert.match(layout, /lang=\{seo\.lang\}/);
  assert.match(layout, /<SeoHead model=\{seo\}/);
  assert.match(layout, /<body><slot \/><\/body>/);
  assert.doesNotMatch(layout, /client:only/);
});

// ----------------------------------------------------------------------------
// Vérifie que le harnais distingue les tests de build des tests de fonctions.
// ----------------------------------------------------------------------------
test('sépare les sélections Vitest sans masquer les suites vides', async function separateTestSuites() {
  // Manifeste npm maintenu, et non un résultat supposé d'installation.
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(manifest.scripts['test:unit'], 'node scripts/run-local-tool.mjs vitest run --project unit');
  assert.equal(manifest.scripts['test:build'], 'node scripts/run-local-tool.mjs vitest run --project build');
  assert.equal(manifest.scripts['test:e2e'], 'node scripts/run-local-tool.mjs playwright test');
  assert.ok(!Object.values(manifest.scripts).some(value => value.includes('passWithNoTests')));
});

// ----------------------------------------------------------------------------
// Vérifie que l'accueil compose le rendu SSR et conserve une vraie route 404.
// ----------------------------------------------------------------------------
test('prépare un accueil SSR et une vraie route 404', async function shellRoutes() {
  // L'accueil hydrate un composant déjà rendu côté serveur ; client:only reste interdit.
  const home = await readFile('src/pages/index.astro', 'utf8');
  // Page d'erreur destinée au mécanisme natif du générateur statique.
  const missing = await readFile('src/pages/404.astro', 'utf8');
  assert.match(home, /<ShowcaseApp client:load/);
  assert.match(home, /buildSeo\(config, route\)/);
  assert.match(missing, /Page not found/);
  assert.doesNotMatch(home + missing, /client:only/);
});

// ----------------------------------------------------------------------------
// Vérifie la présence des routes localisées et de l'endpoint JSON public.
// ----------------------------------------------------------------------------
test('prépare les routes localisées et un JSON de détail isolé', async function localizedRoutes() {
  const home = await readFile('src/pages/[lang]/index.astro', 'utf8');
  const project = await readFile('src/pages/[lang]/projects/[id].astro', 'utf8');
  const endpoint = await readFile('src/pages/data/projects/[id].json.ts', 'utf8');
  assert.match(home, /getStaticPaths/);
  assert.match(project, /Object\.values\(catalogue\.details\)/);
  assert.match(project, /initialProject=\{project\}/);
  assert.match(endpoint, /JSON\.stringify\(project\)/);
  assert.doesNotMatch(home + project + endpoint, /from\s+['"][^'"]*projects\.ts['"]|client:only/);
});


// ----------------------------------------------------------------------------
// Vérifie qu'un arbitre média unique enveloppe tous les lecteurs interactifs.
// ----------------------------------------------------------------------------
test('partage un seul arbitre média dans ShowcaseApp', async function sharedMediaCoordinator() {
  const source = await readFile('src/components/ShowcaseApp.tsx', 'utf8');
  assert.match(source, /MediaCoordinatorContext\.Provider/);
  assert.match(source, /createMediaCoordinator\(\)/);
  assert.match(source, /value=\{mediaCoordinator\}/);
});

// ----------------------------------------------------------------------------
// Vérifie la restauration du focus et le sélecteur de langue dans la popin.
// ----------------------------------------------------------------------------
test('préserve la continuité clavier autour de la fiche modale', async function modalContinuity() {
  const hook = await readFile('src/navigation/useShowcase.ts', 'utf8');
  const modal = await readFile('src/components/ProjectModal.tsx', 'utf8');
  const app = await readFile('src/components/ShowcaseApp.tsx', 'utf8');
  assert.match(hook, /readNavigationRestoreState/);
  assert.match(hook, /scrollTo/);
  assert.match(hook, /getElementById/);
  assert.match(modal, /onSwitchLocale/);
  assert.match(modal, /project-modal__languages/);
  // Le changement de langue passe par une transition animée qui délègue au contrôleur.
  assert.match(app, /onSwitchLocale=\{switchLocaleAnimated\}/);
  assert.match(app, /const \{ openProject, switchLocale \} = controller;/);
  assert.match(app, /flushSync\(\(\) => switchLocale\(locale\)\)/);
});

// ----------------------------------------------------------------------------
// Vérifie que les cartes chargent leur preview seulement sur un vrai survol desktop.
// ----------------------------------------------------------------------------
test('branche la preview vidéo des cartes sur l arbitre média', async function cardHoverPreview() {
  const source = await readFile('src/components/ProjectCard.tsx', 'utf8');
  assert.match(source, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /coordinator\.request\(`hover:/);
  assert.match(source, /HOVER_MEDIA_PRIORITY\s*=\s*20/);
  assert.match(source, /preload="none"/);
});

// ----------------------------------------------------------------------------
// Exige le vrai carrousel Featured piloté par la vidéo et la machine T10.
// ----------------------------------------------------------------------------
test('branche Featured sur vidéo, repli poster et contrôle utilisateur', async () => {
  const source = await readFile('src/components/FeaturedCarousel.tsx', 'utf8');
  assert.match(source, /DEFAULT_POSTER_MS\s*=\s*6000/);
  assert.match(source, /MEDIA_STALL_MS\s*=\s*8000/);
  assert.match(source, /FEATURED_MEDIA_PRIORITY\s*=\s*10/);
  assert.match(source, /muted playsInline preload="metadata"/);
  assert.doesNotMatch(source, /<video[^>]*\sloop/);
  assert.match(source, /pauseRotation|resumeRotation/);
  // Direction « Écran » : survoler ou focaliser un titre de l'index choisit l'aperçu.
  assert.match(source, /onMouseEnter=\{\(\) => previewProject\(index\)\}/);
  assert.match(source, /onFocus=/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /visibilitychange/);
  const app = await readFile('src/components/ShowcaseApp.tsx', 'utf8');
  assert.match(app, /<FeaturedCarousel/);
  assert.match(app, /suspended=\{route\.projectId !== null\}/);
});

// ----------------------------------------------------------------------------
// Exige les endpoints SEO statiques et la propriété des JSON-LD côté client.
// ----------------------------------------------------------------------------
test('génère sitemap robots et remplace les données structurées de route', async () => {
  const sitemap = await readFile('src/pages/sitemap.xml.ts', 'utf8');
  const robots = await readFile('src/pages/robots.txt.ts', 'utf8');
  const robotsModel = await readFile('src/seo/robots.ts', 'utf8');
  const sync = await readFile('src/seo/sync-head.ts', 'utf8');
  assert.match(sitemap, /buildSitemap/);
  assert.match(robots, /buildRobots/);
  assert.match(robotsModel, /Sitemap:/);
  assert.match(sync, /application\/ld\+json/);
  assert.match(sync, /data-project-shelf-structured/);
});

// ----------------------------------------------------------------------------
// Exige les outils de paquet statique et de vérification HTTP sans publication.
// ----------------------------------------------------------------------------
test('prépare la recette de déploiement sans GitHub Actions', async () => {
  const packager = await readFile('scripts/package-static.ts', 'utf8');
  const verifier = await readFile('scripts/verify-deploy.ts', 'utf8');
  assert.match(packager, /auditDist/);
  assert.match(verifier, /fetch/);
  assert.doesNotMatch(verifier, /github action|workflow_dispatch|gh api/i);
});

// ----------------------------------------------------------------------------
// Exige une détection de point d'entrée portable entre POSIX et Windows.
// ----------------------------------------------------------------------------
test('détecte les CLI avec pathToFileURL sans fabriquer une URL file fragile', async () => {
  const packager = await readFile('scripts/package-static.ts', 'utf8');
  const verifier = await readFile('scripts/verify-deploy.ts', 'utf8');
  assert.match(packager, /pathToFileURL/);
  assert.match(verifier, /pathToFileURL/);
  assert.doesNotMatch(packager + verifier, /new URL\(`file:\/\//);
});

// ----------------------------------------------------------------------------
// Exige le guide éditorial et le modèle ProjectShelf sans deuxième schéma.
// ----------------------------------------------------------------------------
test('documente le flux LLM relu et un exemple catalogue vérifiable', async () => {
  const guide = await readFile('docs/content-authoring.md', 'utf8');
  const template = await readFile('docs/project-entry-template.md', 'utf8');
  assert.match(guide, /Source autorisée.*LLM.*relecture humaine.*validation.*build/is);
  assert.match(guide, /source privée.*projet masqué/is);
  assert.match(guide, /aucune auto-date|ne jamais.*date.*automati/is);
  assert.match(template, /PROJECT_SHELF_EXAMPLE_BEGIN/);
  assert.match(template, /repositoryVisibility/);
  assert.match(template, /"private"/);
  assert.match(template, /indexable/);
});

// ----------------------------------------------------------------------------
// Exige la recette finale locale, les scénarios E2E et la mesure sans télémétrie.
// ----------------------------------------------------------------------------
test('prépare la recette T15 sans GitHub Actions ni seuil média inventé', async () => {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  const accessibility = await readFile('tests/e2e/accessibility.spec.ts', 'utf8');
  const performance = await readFile('tests/e2e/performance.spec.ts', 'utf8');
  const resilience = await readFile('tests/e2e/resilience.spec.ts', 'utf8');
  const measurement = await readFile('scripts/measure-output.ts', 'utf8');
  const verification = await readFile('docs/verification.md', 'utf8');
  assert.match(manifest.scripts.verify, /validate:catalogue/);
  assert.match(manifest.scripts.verify, /test:e2e/);
  assert.match(manifest.scripts['measure:output'], /measure-output/);
  assert.match(accessibility, /toBeFocused|Escape/);
  assert.match(performance, /reducedMotion.*reduce|reducedMotion:\s*'reduce'/s);
  assert.match(performance, /\.mp4/);
  assert.match(resilience, /localStorage|projectLoadError|project could not be loaded/i);
  assert.doesNotMatch(measurement, /fetch\(|https?:\/\//);
  assert.match(verification, /NON RÉALISÉ|Non réalisé/i);
  assert.doesNotMatch(manifest.scripts.verify, /github|action|workflow/i);
});

// ----------------------------------------------------------------------------
// Exige un environnement DOM explicite pour les tests React Testing Library.
// ----------------------------------------------------------------------------
test('exécute les tests de composants React dans jsdom', async function componentTestsUseJsdom() {
  const source = await readFile('tests/components/grid.test.tsx', 'utf8');
  assert.match(source, /@vitest-environment\s+jsdom/);
});
