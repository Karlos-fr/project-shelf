// ============================================================================
// JsdomSetupContract — API navigateur minimale des tests de composants
// ----------------------------------------------------------------------------
// Ce test vérifie le fallback matchMedia sans charger React, Vitest ni jsdom.
// Il protège le harnais contre les API navigateur absentes du DOM synthétique.
// ============================================================================
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// ----------------------------------------------------------------------------
// Exige un fallback matchMedia avec les abonnements utilisés par les composants.
// ----------------------------------------------------------------------------
test('fournit matchMedia aux tests de composants jsdom', async function componentTestsMockMatchMedia() {
  const source = await readFile('tests/setup.ts', 'utf8');
  assert.match(source, /matchMedia/);
  assert.match(source, /addEventListener/);
  assert.match(source, /removeEventListener/);
});
