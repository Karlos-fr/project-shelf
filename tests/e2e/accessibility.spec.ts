// ============================================================================
// AccessibilityE2E — Focus clavier et fermeture de la fiche modale
// ----------------------------------------------------------------------------
// Ces parcours utilisent le vrai dialog hydraté. Ils ne remplacent pas la revue
// manuelle de contraste, zoom, lecteur vidéo ou navigation sur appareil réel.
// ============================================================================
import { expect, test } from '@playwright/test';

// ----------------------------------------------------------------------------
// Vérifie entrée fiche, focus titre, Échap et restauration sur la carte déclencheuse.
// ----------------------------------------------------------------------------
test('restaure le focus après fermeture clavier de la fiche', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  const trigger = page.locator('[data-project-grid] [data-project-link="example-audio"]');
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.locator('dialog.project-modal');
  await expect(dialog).toBeVisible();
  const title = dialog.locator('#project-title-example-audio');
  await expect(title).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog).toContainText('Example Audio');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/\/en\/$/u);
});

// ----------------------------------------------------------------------------
// Vérifie que les commandes essentielles de Featured possèdent des noms accessibles.
// ----------------------------------------------------------------------------
test('expose pause et navigation Featured au clavier', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('[data-showcase-ready="true"]')).toBeVisible();
  const featured = page.locator('[data-featured]');
  await expect(featured.getByRole('button', { name: 'Pause rotation' })).toBeVisible();
  await expect(featured.getByRole('button', { name: 'Previous project' })).toBeVisible();
  await expect(featured.getByRole('button', { name: 'Next project' })).toBeVisible();
});
