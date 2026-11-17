// ============================================================================
// VerifyBuildContract — Origine et mode stables de la recette complète
// ----------------------------------------------------------------------------
// Ce test protège les canonical/hreflang générés avant les tests de build et E2E.
// Il ne lance ni Astro ni un navigateur et n'accède à aucun réseau.
// ============================================================================
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// ----------------------------------------------------------------------------
// Exige une fixture de production explicite pour rendre les métadonnées déterministes.
// ----------------------------------------------------------------------------
test('construit la fixture de recette avec une origine de production explicite', async function verificationBuildOrigin() {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  const verify = manifest.scripts.verify;
  assert.match(verify, /npm run build -- --fixture/);
  assert.match(verify, /--mode production/);
  assert.match(verify, /--origin https:\/\/example\.test/);
  assert.match(verify, /--base \/(?:\s|&&)/);
});
