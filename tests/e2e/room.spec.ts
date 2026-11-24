// ============================================================================
// RoomE2E — Page « La chambre » : contenu sans JavaScript et garde-fou de chargement
// ----------------------------------------------------------------------------
// Sans JavaScript, chaque langue sert son titre et la liste des projets. Avec
// JavaScript, une marque de plantage laissée par un chargement précédent ne garde la
// version HTML qu'une fois : « Réessayer » relance la 3D (prête si le navigateur de test
// a WebGPU, sinon message dédié, jamais plus la page de secours du plantage).
// ============================================================================
import { expect, test } from '@playwright/test';

// Marque de session posée par la page pendant le chargement de la scène.
const CRASH_FLAG = 'project-shelf:room-loading';

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  // --------------------------------------------------------------------------
  // Vérifie le titre, la langue et les liens vers les fiches, en français et en anglais.
  // --------------------------------------------------------------------------
  for (const [locale, title, index] of [
    ['fr', 'La chambre — une vitrine 3D en temps réel', 'Projets de la chambre'],
    ['en', 'The bedroom — a 3D showcase in real time', 'Projects in the room'],
  ] as const) {
    test(`sert la chambre en ${locale} avec ses liens de projets`, async ({ page }) => {
      await page.goto(`/${locale}/chambre/`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.getByRole('heading', { level: 2, name: index })).toBeAttached();
      const links = page.locator('.shelf__index a');
      expect(await links.count()).toBeGreaterThan(0);
      await expect(links.first()).toHaveAttribute('href', new RegExp(`^/${locale}/projects/[^/]+/$`));
    });
  }
});

// ----------------------------------------------------------------------------
// Simule un onglet tué pendant le chargement : la marque est posée avant la première
// visite seulement. La page de secours s'affiche une fois, la marque est effacée, et
// « Réessayer » relance la scène.
// ----------------------------------------------------------------------------
test('ne garde la page de secours qu’une fois après un chargement interrompu', async ({ page }) => {
  await page.addInitScript((flag) => {
    if (sessionStorage.getItem('e2e:seeded') === null) {
      sessionStorage.setItem('e2e:seeded', '1');
      sessionStorage.setItem(flag, '1');
    }
  }, CRASH_FLAG);
  await page.goto('/fr/chambre/');
  const retry = page.getByRole('button', { name: 'Réessayer la chambre 3D' });
  await expect(retry).toBeVisible();
  await expect(page.locator('.room-page')).toHaveAttribute('data-state', 'failed');
  expect(await page.evaluate((flag) => sessionStorage.getItem(flag), CRASH_FLAG)).toBeNull();

  await retry.click();
  await page.waitForLoadState('load');
  // Après la relance : scène prête, ou message WebGPU si le navigateur de test n'en a pas,
  // mais plus jamais le bouton de la page de secours du plantage.
  await expect(async () => {
    const state = await page.locator('.room-page').getAttribute('data-state');
    const noWebGpu = await page.getByText('La chambre 3D a besoin de WebGPU').isVisible();
    expect(state === 'ready' || noWebGpu).toBe(true);
  }).toPass({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Réessayer la chambre 3D' })).toHaveCount(0);
});
