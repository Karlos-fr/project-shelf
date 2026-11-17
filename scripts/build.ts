// ============================================================================
// ProjectShelfBuild — Pipeline local de validation, projection, Astro et audit
// ----------------------------------------------------------------------------
// Ce script prépare un espace public depuis une source explicite avant de lancer
// Astro. Il ne télécharge aucun média, ne publie rien et n'utilise pas GitHub Actions.
// ============================================================================
import { copyFile, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseBuildOptions } from './build-options.ts';
import { auditDist } from './audit-dist.ts';
import { collectMedia, resolveLocalMedia } from './media-manifest.ts';
import { forbiddenMarkers, publishCatalogue } from './publish-catalogue.ts';
import { loadSiteConfig } from '../src/config/site.ts';
import { parseCatalogue } from '../src/domain/schema.ts';
import type { Catalogue, PublishedCatalogue } from '../src/domain/project.ts';

// Racine absolue du dépôt, indépendante du répertoire courant de l'appelant.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
// Répertoire généré intégralement remplaçable entre deux constructions.
const GENERATED_ROOT = join(ROOT, '.generated');
// Fichier assaini que les pages Astro sont seules autorisées à charger.
const PUBLISHED_PATH = join(GENERATED_ROOT, 'catalogue.json');
// Répertoire public distribué par Astro ; il ne contient que les médias sélectionnés.
const PUBLIC_DIR = join(GENERATED_ROOT, 'public');
// Répertoire de sortie Astro audité après chaque build réussi.
const DIST_DIR = join(ROOT, 'dist');

try {
  const options = parseBuildOptions(process.argv.slice(2), process.env);
  const env = siteEnvironment(options);
  loadSiteConfig(env);
  const source = await sourceCatalogue(options.fixture);
  const catalogue = parseCatalogue(source);
  const published = publishCatalogue(catalogue);
  await stageGenerated(published, options.fixture);
  await rm(DIST_DIR, { recursive: true, force: true });
  const result = runAstro(env);
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Astro interrompu par le signal ${result.signal}.`);
  if (result.status !== 0) throw new Error(`Astro build a échoué avec le code ${result.status ?? 1}.`);
  await auditDist(DIST_DIR, forbiddenMarkers(catalogue));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

// ----------------------------------------------------------------------------
// Convertit les options déjà analysées en variables acceptées par SiteConfig/Astro.
// ----------------------------------------------------------------------------
function siteEnvironment(options: ReturnType<typeof parseBuildOptions>): Record<string, string | undefined> {
  return {
    SITE_MODE: options.mode,
    SITE_ORIGIN: options.origin,
    SITE_BASE: options.base,
    SITE_FIXTURE: options.fixture ? 'true' : 'false',
    PROJECT_SHELF_PUBLISHED_CATALOGUE: PUBLISHED_PATH,
  };
}

// ----------------------------------------------------------------------------
// Charge exclusivement la source réelle ou les fixtures selon le flag explicite.
// Paramètres : fixture interdit tout mélange entre catalogue réel et données de test.
// ----------------------------------------------------------------------------
async function sourceCatalogue(fixture: boolean): Promise<Catalogue> {
  if (fixture) {
    const fixtures = await import('../tests/fixtures/catalogue.ts');
    return { categories: structuredClone(fixtures.fixtureCategories), projects: fixtures.fixtureProjects() };
  }
  const production = await import('../src/data/projects.ts');
  return structuredClone(production.PROJECT_CATALOGUE);
}

// ----------------------------------------------------------------------------
// Prépare catalogue JSON et médias locaux dans un staging avant remplacement.
// Paramètres : published ne contient déjà aucun projet hidden ni lien privé.
// Effets de bord : copie seulement les chemins listés par collectMedia.
// ----------------------------------------------------------------------------
async function stageGenerated(published: PublishedCatalogue, fixture: boolean): Promise<void> {
  await mkdir(GENERATED_ROOT, { recursive: true });
  const stage = await mkdtemp(join(GENERATED_ROOT, 'stage-'));
  const stagePublic = join(stage, 'public');
  const stageCatalogue = join(stage, 'catalogue.json');
  await mkdir(stagePublic, { recursive: true });
  await writeFile(stageCatalogue, `${JSON.stringify(published)}\n`, 'utf8');
  const mediaRoot = fixture ? join(ROOT, 'tests/fixtures/media') : join(ROOT, 'content/media');
  for (const logicalPath of collectMedia(Object.values(published.details))) {
    const source = await resolveLocalMedia(mediaRoot, logicalPath);
    const target = logicalMediaTarget(stagePublic, logicalPath);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  await rm(PUBLIC_DIR, { recursive: true, force: true });
  await rm(PUBLISHED_PATH, { force: true });
  await rename(stagePublic, PUBLIC_DIR);
  await rename(stageCatalogue, PUBLISHED_PATH);
  await rm(stage, { recursive: true, force: true });
}

// ----------------------------------------------------------------------------
// Résout un chemin logique média vers le nom de fichier réellement servi par Astro.
// ----------------------------------------------------------------------------
function logicalMediaTarget(publicDir: string, logicalPath: string): string {
  const segments = logicalPath.slice(1).split('/').map(decodeURIComponent);
  return resolve(publicDir, ...segments);
}

// ----------------------------------------------------------------------------
// Lance Astro avec le Node courant et le résolveur local des CLI du dépôt.
// Retour : résultat synchrone dont le code est propagé par l'appelant.
// ----------------------------------------------------------------------------
function runAstro(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, [join(ROOT, 'scripts/run-local-tool.mjs'), 'astro', 'build'], {
    cwd: ROOT,
    env: { ...process.env, ...definedEnvironment(env) },
    stdio: 'inherit',
    shell: false,
  });
}

// ----------------------------------------------------------------------------
// Retire les valeurs undefined avant de transmettre l'environnement au sous-processus.
// ----------------------------------------------------------------------------
function definedEnvironment(env: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const output: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) if (value !== undefined) output[key] = value;
  return output;
}
