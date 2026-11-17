// ============================================================================
// LocalToolTests — Protection contre les exécutables globaux homonymes
// ----------------------------------------------------------------------------
// Les paquets temporaires ci-dessous testent seulement la résolution d'un CLI.
// Ils ne sont jamais installés dans le projet et ne simulent pas un build Astro.
// ============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLocalTool } from '../../scripts/local-tool.mjs';

// ----------------------------------------------------------------------------
// Refuse l'absence du paquet au lieu de chercher un programme homonyme sur PATH.
// ----------------------------------------------------------------------------
test('exige le paquet npm local de Playwright', function requiresLocalPackage() {
  // Racine temporaire vide, sans node_modules hérité du projet.
  const root = mkdtempSync(join(tmpdir(), 'project-shelf-cli-'));
  try {
    assert.throws(() => resolveLocalTool('playwright', root), /@playwright\/test.*npm run setup/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// N'autorise que les outils définis dans le contrat du projet.
// ----------------------------------------------------------------------------
test('refuse un nom de programme arbitraire', function restrictTools() {
  assert.throws(() => resolveLocalTool('curl', process.cwd()), /Outil inconnu/);
});

// ----------------------------------------------------------------------------
// Vérifie la résolution du champ bin sur un paquet jetable isolé.
// Effets de bord : crée puis supprime une fixture de manifeste, sans lancer son code.
// ----------------------------------------------------------------------------
test('résout le CLI déclaré par le paquet, pas un chemin inventé', function resolveManifestBin() {
  // Racine de fixture réservée à ce test de résolution.
  const root = mkdtempSync(join(tmpdir(), 'project-shelf-cli-'));
  try {
    // Paquet synthétique : aucun appel à l'outil Astro réel n'est revendiqué.
    const directory = join(root, 'node_modules', 'astro');
    mkdirSync(join(directory, 'bin'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{}');
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'astro', bin: { astro: './bin/astro.mjs' } }));
    writeFileSync(join(directory, 'bin', 'astro.mjs'), '');
    assert.equal(resolveLocalTool('astro', root), join(directory, 'bin', 'astro.mjs'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// Vérifie que tsx, utilisé par les scripts de validation et de build, est résolu localement.
// Effets de bord : crée puis supprime un paquet synthétique sans exécuter son CLI.
// ----------------------------------------------------------------------------
test('résout le CLI tsx déclaré dans les dépendances de développement', function resolveTsxCli() {
  // Racine de fixture dédiée à la résolution du CLI tsx.
  const root = mkdtempSync(join(tmpdir(), 'project-shelf-cli-'));
  try {
    // Paquet synthétique : aucun téléchargement ni exécution de tsx.
    const directory = join(root, 'node_modules', 'tsx');
    mkdirSync(join(directory, 'dist'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{}');
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'tsx', bin: { tsx: './dist/cli.mjs' } }));
    writeFileSync(join(directory, 'dist', 'cli.mjs'), '');
    assert.equal(resolveLocalTool('tsx', root), join(directory, 'dist', 'cli.mjs'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
