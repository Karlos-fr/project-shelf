// ============================================================================
// RunLocalTool — Exécution d'un CLI npm installé dans le projet
// ----------------------------------------------------------------------------
// Ce lanceur évite notamment de lancer Playwright Python à la place de @playwright/test.
// Aucun shell, installation implicite, déploiement ou repli global n'est utilisé.
// ============================================================================
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveLocalTool } from './local-tool.mjs';

// Racine déduite du fichier, pas d'une entrée utilisateur ou d'un secret.
const root = fileURLToPath(new URL('../', import.meta.url));
// Premier argument : outil connu ; les arguments suivants sont transmis sans shell.
const [name, ...args] = process.argv.slice(2);

try {
  // Chemin du CLI du paquet npm ; une absence interrompt explicitement la commande.
  const executable = resolveLocalTool(name, root);
  // Sous-processus Node ; préserver le statut et les signaux plutôt que les ignorer.
  const result = spawnSync(process.execPath, [executable, ...args], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.signal) process.kill(process.pid, result.signal);
  else process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
