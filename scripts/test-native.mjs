// ============================================================================
// RunNativeTests — Exécution locale des suites indépendantes du registre npm
// ----------------------------------------------------------------------------
// Les fichiers sont énumérés sans glob de shell pour fonctionner aussi sous Windows.
// Ce runner ne simule pas Vitest, Astro, React ou les tests de navigateur.
// ============================================================================
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// La racine du dépôt est indépendante du répertoire depuis lequel le script est appelé.
const root = fileURLToPath(new URL('../', import.meta.url));
// Les contrats npm de T1 et les nouveaux tests de domaine restent des suites distinctes.
const directories = ['tests/bootstrap', 'tests/native'];

try {
  // Une liste explicite de chemins évite les différences de développement des globs.
  const files = directories.flatMap(testFilesInDirectory).sort();
  if (!files.length) throw new Error('Aucun test natif trouvé.');
  // Seul le Node courant exécute les vrais fichiers de tests, sans shell ni téléchargement.
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...files], {
    cwd: root, stdio: 'inherit', shell: false,
  });
  if (result.error) throw result.error;
  if (result.signal) process.kill(process.pid, result.signal);
  else process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

// ----------------------------------------------------------------------------
// Énumère les entrées natives d'une suite sans inclure les tests Vitest.
// Paramètres : directory est un répertoire relatif prévu par le runner.
// Retour : chemins absolus vers ses seuls fichiers .test.mjs.
// Effets de bord : lit les noms des fichiers, sans modifier le dépôt.
// ----------------------------------------------------------------------------
function testFilesInDirectory(directory) {
  // Le dossier appartient à la liste interne, pas à une entrée du catalogue.
  const folder = join(root, directory);
  return readdirSync(folder).filter(isNativeTest).map(testPath);
  // ----------------------------------------------------------------------------
  // Résout le nom du test dans son répertoire connu.
  // Paramètres : name est un nom fourni par readdir ; retour : chemin absolu.
  // ----------------------------------------------------------------------------
  function testPath(name) { return join(folder, name); }
}

// ----------------------------------------------------------------------------
// Sélectionne les entrées conçues pour le runner Node, sans charger de paquet tiers.
// Paramètres : name est un nom de fichier ; retour : appartenance à la suite native.
// ----------------------------------------------------------------------------
function isNativeTest(name) { return name.endsWith('.test.mjs'); }
