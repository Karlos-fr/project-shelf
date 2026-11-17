// ============================================================================
// LocalTool — Résolution des CLI du projet sans repli sur le PATH global
// ----------------------------------------------------------------------------
// Ce module retrouve les binaires npm déclarés dans leur propre manifeste.
// Il ne télécharge rien et ne remplace pas un outil absent par une autre version.
// ============================================================================
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Seuls les outils de la chaîne approuvée peuvent être invoqués par ce lanceur.
const TOOLS = {
  astro: { package: 'astro', bin: 'astro' },
  vitest: { package: 'vitest', bin: 'vitest' },
  playwright: { package: '@playwright/test', bin: 'playwright' },
  tsx: { package: 'tsx', bin: 'tsx' },
};

// ----------------------------------------------------------------------------
// Retrouve un CLI npm à partir de la racine du projet, sans accéder au réseau.
// Paramètres : name identifie l'outil autorisé ; root est le dossier du manifeste.
// Retour : chemin absolu du fichier exécutable par Node.
// Erreurs : refuse les outils inconnus, les paquets absents et les binaires invalides.
// ----------------------------------------------------------------------------
export function resolveLocalTool(name, root) {
  // Le nom ne devient jamais un programme shell ; la table fournit le paquet attendu.
  const tool = Object.hasOwn(TOOLS, name) ? TOOLS[name] : undefined;
  if (!tool) throw new Error(`Outil inconnu : ${name}`);
  // Résolution npm standard depuis ce projet, sans recherche d'exécutables sur PATH.
  const localRequire = createRequire(join(resolve(root), 'package.json'));
  let manifestPath;
  try {
    manifestPath = localRequire.resolve(`${tool.package}/package.json`);
  } catch {
    throw new Error(`${tool.package} absent localement. Exécuter npm run setup avant cette commande.`);
  }
  // Métadonnées du paquet effectivement résolu, non déduites de son numéro de version.
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  // Un paquet peut déclarer un seul CLI ou une table de programmes.
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[tool.bin];
  if (typeof bin !== 'string' || bin.length === 0) throw new Error(`CLI manquant dans ${tool.package}.`);
  // Chemin réel du CLI déclaré ; Node n'a pas besoin de lancer un fichier .cmd.
  const executable = resolve(dirname(manifestPath), bin);
  if (!existsSync(executable)) throw new Error(`CLI absent sur disque pour ${tool.package}.`);
  return executable;
}
