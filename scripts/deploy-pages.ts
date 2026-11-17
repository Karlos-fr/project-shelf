// ============================================================================
// DeployPages — Préparation locale d'une publication GitHub Pages
// ----------------------------------------------------------------------------
// Ce script construit le site de production pour l'adresse Pages du dépôt,
// ajoute .nojekyll (et CNAME), contrôle l'export puis commite dist sur la branche
// gh-pages via un worktree temporaire. Il ne pousse rien sans --push explicite
// et ne modifie ni la branche courante ni le répertoire de travail.
// ============================================================================
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPagesLimits, parseDeployOptions, resolvePagesTarget, type DistributedFile, type PagesTarget } from './pages-target.ts';

// Racine absolue du dépôt, indépendante du répertoire courant de l'appelant.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
// Sortie Astro auditée par scripts/build.ts.
const DIST_DIR = join(ROOT, 'dist');
// Branche servie par GitHub Pages en mode « Deploy from a branch ».
const PAGES_BRANCH = 'gh-pages';
// Fichiers sans lesquels la publication serait manifestement incomplète.
const REQUIRED_FILES = ['index.html', '404.html', 'en/index.html', 'fr/index.html', '.nojekyll'];

try {
  const options = parseDeployOptions(process.argv.slice(2));
  const target = resolvePagesTarget(options, gitOutput(['remote', 'get-url', 'origin'], true));
  console.log(`Cible GitHub Pages : ${target.url}${options.fixture ? ' (essai avec les projets de test)' : ''}`);
  runBuild(target, options.fixture);
  await finalizeDist(target);
  const files = await listFiles(DIST_DIR);
  for (const warning of checkPagesLimits(files)) console.warn(`Attention : ${warning}`);
  console.log(`Export vérifié : ${files.length} fichiers, ${formatMegabytes(files.reduce((sum, file) => sum + file.bytes, 0))}.`);
  if (options.fixture) {
    console.log('Essai terminé : aucune branche n’est préparée avec les projets de test.');
  } else {
    const committed = await commitToPagesBranch(target);
    if (options.push) {
      run('git', ['push', 'origin', PAGES_BRANCH], ROOT);
      console.log(`Branche ${PAGES_BRANCH} poussée. Dans GitHub : Settings → Pages → Deploy from a branch → ${PAGES_BRANCH} / (root).`);
    } else {
      console.log(committed
        ? `Branche locale ${PAGES_BRANCH} prête. Pour publier : git push origin ${PAGES_BRANCH} (ou relancer avec --push).`
        : `Branche locale ${PAGES_BRANCH} déjà à jour : rien de nouveau à publier.`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

// ----------------------------------------------------------------------------
// Lance le pipeline de build existant en mode production pour la cible.
// Paramètres : target fournit origine et préfixe ; fixture choisit les projets de test.
// Erreurs : propage l'échec du build, qui inclut validation et audit de dist.
// ----------------------------------------------------------------------------
function runBuild(target: PagesTarget, fixture: boolean): void {
  const args = [join(ROOT, 'scripts/run-local-tool.mjs'), 'tsx', join(ROOT, 'scripts/build.ts'),
    '--mode', 'production', '--origin', target.origin, '--base', target.base];
  if (fixture) args.push('--fixture');
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Le build de production a échoué : rien n’a été préparé pour Pages.');
}

// ----------------------------------------------------------------------------
// Ajoute les fichiers propres à Pages puis vérifie la présence des pages clés.
// Effets de bord : écrit dist/.nojekyll (Jekyll ignorerait _astro/) et dist/CNAME.
// ----------------------------------------------------------------------------
async function finalizeDist(target: PagesTarget): Promise<void> {
  await writeFile(join(DIST_DIR, '.nojekyll'), '');
  if (target.cname !== undefined) await writeFile(join(DIST_DIR, 'CNAME'), `${target.cname}\n`);
  for (const file of REQUIRED_FILES) {
    try { await stat(join(DIST_DIR, file)); } catch { throw new Error(`Export incomplet : dist/${file} est absent.`); }
  }
}

// ----------------------------------------------------------------------------
// Commite le contenu de dist sur gh-pages dans un worktree temporaire.
// Retour : true si un nouveau commit a été créé, false si rien n'a changé.
// Effets de bord : crée ou met à jour la branche locale gh-pages uniquement ;
// le worktree temporaire est toujours retiré, même en cas d'erreur.
// ----------------------------------------------------------------------------
async function commitToPagesBranch(target: PagesTarget): Promise<boolean> {
  const source = gitOutput(['rev-parse', '--short', 'HEAD']) ?? 'inconnu';
  const dirty = (gitOutput(['status', '--porcelain']) ?? '').length > 0;
  ensureLocalPagesBranch();
  const worktree = await mkdtemp(join(tmpdir(), 'project-shelf-pages-'));
  const hasBranch = gitOutput(['rev-parse', '--verify', '--quiet', `refs/heads/${PAGES_BRANCH}`], true) !== undefined;
  try {
    if (hasBranch) {
      run('git', ['worktree', 'add', worktree, PAGES_BRANCH], ROOT);
    } else {
      run('git', ['worktree', 'add', '--detach', worktree], ROOT);
      run('git', ['checkout', '--orphan', PAGES_BRANCH], worktree);
    }
    // La branche publiée ne contient que l'export : tout le reste est retiré.
    for (const entry of await readdir(worktree)) if (entry !== '.git') await rm(join(worktree, entry), { recursive: true, force: true });
    await cp(DIST_DIR, worktree, { recursive: true });
    run('git', ['add', '--all'], worktree);
    const staged = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: worktree, shell: false });
    if (staged.status === 0 && hasBranch) return false;
    const suffix = dirty ? ' (avec modifications locales non commitées)' : '';
    run('git', ['commit', '--quiet', '-m', `deploy: ${target.url} depuis ${source}${suffix}`], worktree);
    return true;
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: ROOT, shell: false });
    await rm(worktree, { recursive: true, force: true });
  }
}

// ----------------------------------------------------------------------------
// Récupère une branche gh-pages distante absente localement, pour conserver
// son historique au lieu de créer une branche orpheline concurrente.
// ----------------------------------------------------------------------------
function ensureLocalPagesBranch(): void {
  if (gitOutput(['rev-parse', '--verify', '--quiet', `refs/heads/${PAGES_BRANCH}`], true) !== undefined) return;
  const remote = spawnSync('git', ['ls-remote', '--exit-code', '--heads', 'origin', PAGES_BRANCH], { cwd: ROOT, shell: false });
  if (remote.status === 0) run('git', ['fetch', 'origin', `${PAGES_BRANCH}:${PAGES_BRANCH}`], ROOT);
}

// ----------------------------------------------------------------------------
// Liste récursivement les fichiers d'un dossier avec leur taille.
// ----------------------------------------------------------------------------
async function listFiles(root: string): Promise<DistributedFile[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const files: DistributedFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: (await stat(path)).size });
  }
  return files;
}

// ----------------------------------------------------------------------------
// Exécute une commande et échoue avec son code si elle ne réussit pas.
// ----------------------------------------------------------------------------
function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Échec de « ${command} ${args.join(' ')} » (code ${result.status ?? 1}).`);
}

// ----------------------------------------------------------------------------
// Retourne la sortie texte d'une commande git, ou undefined si optional et en échec.
// ----------------------------------------------------------------------------
function gitOutput(args: readonly string[], optional = false): string | undefined {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: false });
  if (result.status === 0) return result.stdout.trim();
  if (optional) return undefined;
  throw new Error(`Échec de « git ${args.join(' ')} ».`);
}

// ----------------------------------------------------------------------------
// Formate une taille en mégaoctets avec une décimale.
// ----------------------------------------------------------------------------
function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
