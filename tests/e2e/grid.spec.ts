// ============================================================================
// ProjectGridE2E — Responsive et contrôles de la bibliothèque hydratée
// ----------------------------------------------------------------------------
// Ce parcours vérifie le résultat visible plutôt que les fonctions pures déjà
// couvertes en T4.
// ==========================================================================
import { expect, test } from '@playwright/test';

// ----------------------------------------------------------------------------
// Vérifie recherche, reset et largeur desktop de quatre cartes.
// ----------------------------------------------------------------------------
test('filtre la grille et conserve quatre colonnes sur desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/en/');
  await expect(page.locator('[data-project-grid]')).toBeVisible();
  const first = page.locator('[data-project-grid] [data-project-card]').first();
  const second = page.locator('[data-project-grid] [data-project-card]').nth(1);
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(Math.abs((secondBox?.y ?? 1) - (firstBox?.y ?? 0))).toBeLessThan(2);
  await page.getByRole('searchbox').fill('introuvable');
  await expect(page.getByRole('status')).toHaveText('0 projects');
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.getByRole('status')).toHaveText('4 projects');
});
