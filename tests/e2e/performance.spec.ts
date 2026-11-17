// ============================================================================
// PerformanceE2E — Réseau média et comportement sous mouvement réduit
// ----------------------------------------------------------------------------
// Ces tests contrôlent des invariants de chargement. Ils ne prétendent pas mesurer
// l'INP terrain ni garantir les Core Web Vitals d'un futur catalogue réel.
// ============================================================================
import { expect, test } from '@playwright/test';

// ----------------------------------------------------------------------------
// Vérifie qu'aucune preview MP4 décorative n'est demandée avec mouvement réduit.
// ----------------------------------------------------------------------------
test('ne récupère aucune preview en mode mouvement réduit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const videos: string[] = [];
  page.on('request', (request) => {
    if (/\.mp4(?:\?|$)/u.test(request.url())) videos.push(request.url());
  });
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  await page.waitForTimeout(300);
  expect(videos).toEqual([]);
});

// ----------------------------------------------------------------------------
// Vérifie que le poster reste suffisant tant qu'aucune carte n'est survolée.
// ----------------------------------------------------------------------------
test('ne crée pas de lecteur de grille avant un vrai survol', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  const card = page.locator('[data-project-grid] [data-project-card="example-audio"]');
  await expect(card.locator('img')).toBeVisible();
  await expect(card.locator('video')).toHaveCount(0);
});
