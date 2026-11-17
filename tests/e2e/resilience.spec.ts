// ============================================================================
// ResilienceE2E — Stockage refusé et ressources de détail indisponibles
// ----------------------------------------------------------------------------
// Ces scénarios provoquent volontairement des défaillances locales. Ils vérifient
// que les liens HTML et la navigation restent utilisables sans masquer l'erreur.
// ============================================================================
import { expect, test } from '@playwright/test';

// ----------------------------------------------------------------------------
// Vérifie qu'un localStorage indisponible ne bloque pas un changement de langue.
// ----------------------------------------------------------------------------
test('continue sans stockage local', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Storage blocked', 'SecurityError'); },
    });
  });
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  await page.locator('.site-header a[lang="fr"]').click();
  await expect(page).toHaveURL(/\/fr\/$/u);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

// ----------------------------------------------------------------------------
// Vérifie le repli vers la page complète lorsqu'un JSON de popin est bloqué.
// ----------------------------------------------------------------------------
test('propose la page complète si le détail JSON échoue', async ({ page }) => {
  await page.route('**/data/projects/example-audio.json', (route) => route.abort('failed'));
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  await page.locator('[data-project-grid] [data-project-link="example-audio"]').click();
  const dialog = page.locator('dialog.project-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('The project could not be loaded.');
  await expect(dialog.getByRole('link', { name: 'Open the full page' })).toHaveAttribute('href', /\/en\/projects\/example-audio\/$/u);
});

// ----------------------------------------------------------------------------
// Vérifie qu'un média bloqué ne supprime jamais le lien natif de la carte.
// ----------------------------------------------------------------------------
test('conserve la navigation si une preview vidéo est bloquée', async ({ page }) => {
  await page.route('**/*.mp4', (route) => route.abort('failed'));
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  const card = page.locator('[data-project-grid] [data-project-card="example-audio"]');
  await card.hover();
  await expect(card.locator('[data-project-link="example-audio"]')).toBeVisible();
});
