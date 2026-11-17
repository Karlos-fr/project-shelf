// ============================================================================
// SetupToolchain — Installation explicite et verrouillée des dépendances T1
// ----------------------------------------------------------------------------
// Ce script est lancé avec npm run setup dans un environnement ayant accès au registre.
// Il ne déploie rien et ne remplace jamais un échec d'installation par un faux succès.
// ============================================================================
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Racine du projet, indépendante du répertoire depuis lequel Node serait appelé.
const root = fileURLToPath(new URL('../', import.meta.url));
// Chemin du CLI npm fourni par npm run ; éviter npm.cmd et shell=true sous Windows.
const npmCli = process.env.npm_execpath;
// Délai maximum d'un appel npm, en millisecondes ; une expiration est un échec.
const NPM_TIMEOUT_MS = 180_000;

// ----------------------------------------------------------------------------
// Exécute une commande npm sans shell et préserve son échec.
// Paramètres : args est la liste exacte des arguments, sans interpolation shell.
// Effets de bord : peut consulter le registre et installer les paquets demandés.
// Erreurs : arrête le script si npm est absent, expire ou retourne un code non nul.
// ----------------------------------------------------------------------------
function runNpm(args) {
  if (!npmCli) throw new Error('Lancer ce script avec npm run setup.');
  // Résultat réel du CLI ; aucun accès à un service GitHub Actions.
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root, stdio: 'inherit', shell: false, timeout: NPM_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm a échoué (code ${result.status ?? 'interrompu'}).`);
}

// ----------------------------------------------------------------------------
// Résout et sauvegarde des versions exactes à partir du manifeste préparé.
// Effets de bord : écrit node_modules, package.json et le véritable package-lock.json.
// La présence du lock ne vaut pas validation du build ou des tests.
// ----------------------------------------------------------------------------
function main() {
  // Manifeste versionné, lu uniquement depuis la racine de ce projet.
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  runNpm(['view', `astro@${manifest.dependencies.astro}`, 'engines', '--json']);
  runNpm(['view', `vitest@${manifest.devDependencies.vitest}`, 'engines', '--json']);
  // Les versions résolues seront écrites sans ^ ni ~ par --save-exact.
  const runtime = Object.entries(manifest.dependencies).map(([name, version]) => `${name}@${version}`);
  // Les outils de développement restent séparés des dépendances de la vitrine.
  const development = Object.entries(manifest.devDependencies).map(([name, version]) => `${name}@${version}`);
  runNpm(['install', '--save-exact', '--no-fund', ...runtime]);
  runNpm(['install', '--save-dev', '--save-exact', '--no-fund', ...development]);
  runNpm(['ls', '--depth=0']);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
