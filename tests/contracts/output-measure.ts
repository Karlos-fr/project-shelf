// ============================================================================
// OutputMeasureCases — Contrats de mesure locale du paquet statique
// ----------------------------------------------------------------------------
// Ces tests utilisent uniquement des fichiers temporaires synthétiques. Ils
// vérifient les totaux et les budgets explicites sans aucune télémétrie réseau.
// ============================================================================
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureOutput, parseMeasureOptions, verifyOutputBudgets } from '../../scripts/measure-output.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios de mesure auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerOutputMeasureTests(register: RegisterCase): void {
  register('mesure séparément JavaScript images vidéos et autres fichiers', measureCase);
  register('n impose aucun budget arbitraire par défaut', defaultBudgetCase);
  register('refuse un budget explicite dépassé', explicitBudgetCase);
  register('analyse les options de mesure sans option inconnue', parseCase);
}

// ----------------------------------------------------------------------------
// Mesure un arbre synthétique dont les tailles sont déterministes.
// ----------------------------------------------------------------------------
async function measureCase(): Promise<void> {
  await withOutput(async (root) => {
    await mkdir(join(root, 'assets'));
    await mkdir(join(root, 'media'));
    await writeFile(join(root, 'assets', 'app.js'), Buffer.alloc(11));
    await writeFile(join(root, 'assets', 'chunk.mjs'), Buffer.alloc(7));
    await writeFile(join(root, 'media', 'poster.webp'), Buffer.alloc(13));
    await writeFile(join(root, 'media', 'preview.mp4'), Buffer.alloc(17));
    await writeFile(join(root, 'index.html'), Buffer.alloc(19));
    const report = await measureOutput(root);
    assert.equal(report.totalBytes, 67);
    assert.equal(report.javascriptBytes, 18);
    assert.equal(report.imageBytes, 13);
    assert.equal(report.videoBytes, 17);
    assert.equal(report.otherBytes, 19);
    assert.equal(report.files, 5);
    assert.equal(report.largestMedia?.bytes, 17);
    assert.match(report.largestMedia?.path ?? '', /preview\.mp4$/u);
  });
}

// ----------------------------------------------------------------------------
// Vérifie que la mesure seule ne transforme pas une recommandation en seuil produit.
// ----------------------------------------------------------------------------
function defaultBudgetCase(): void {
  assert.doesNotThrow(() => verifyOutputBudgets({
    root: 'dist', files: 1, totalBytes: 9_999_999, javascriptBytes: 9_999_999,
    imageBytes: 0, videoBytes: 0, otherBytes: 0,
  }, {}));
}

// ----------------------------------------------------------------------------
// Vérifie un seuil fourni explicitement par la recette, sans valeur implicite.
// ----------------------------------------------------------------------------
function explicitBudgetCase(): void {
  const report = {
    root: 'dist', files: 2, totalBytes: 150, javascriptBytes: 80,
    imageBytes: 70, videoBytes: 0, otherBytes: 0,
    largestMedia: { path: 'poster.webp', bytes: 70 },
  };
  assert.throws(() => verifyOutputBudgets(report, { maxJavascriptBytes: 79 }), /JavaScript/u);
  assert.throws(() => verifyOutputBudgets(report, { maxMediaFileBytes: 69 }), /média/u);
  assert.doesNotThrow(() => verifyOutputBudgets(report, { maxJavascriptBytes: 80, maxMediaFileBytes: 70 }));
}

// ----------------------------------------------------------------------------
// Vérifie les options CLI et l'absence de coercition de nombres invalides.
// ----------------------------------------------------------------------------
function parseCase(): void {
  assert.deepEqual(parseMeasureOptions([]), { root: 'dist', budgets: {} });
  assert.deepEqual(parseMeasureOptions(['--root', 'out', '--max-js-bytes', '100', '--max-media-bytes', '200']), {
    root: 'out', budgets: { maxJavascriptBytes: 100, maxMediaFileBytes: 200 },
  });
  assert.throws(() => parseMeasureOptions(['--max-js-bytes', '0']));
  assert.throws(() => parseMeasureOptions(['--wat', '1']));
}

// ----------------------------------------------------------------------------
// Encadre un scénario par un dossier temporaire supprimé même en cas d'échec.
// ----------------------------------------------------------------------------
async function withOutput(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'project-shelf-output-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}
