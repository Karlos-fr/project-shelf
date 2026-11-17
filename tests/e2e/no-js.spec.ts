// ============================================================================
// NoJavaScriptE2E — Vérification du contenu essentiel sans hydratation
// ----------------------------------------------------------------------------
// Les fiches, liens de langue et médias manuels doivent rester accessibles lorsque
// le JavaScript client est désactivé.
// ==========================================================================
import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

// ----------------------------------------------------------------------------
// Vérifie l'accès direct à une fiche localisée sans React côté client.
// ----------------------------------------------------------------------------
test('rend une fiche complète sans JavaScript', async ({ page }) => {
  await page.goto('/fr/projects/example-audio/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('article[data-project-id="example-audio"]')).toContainText('Exemple audio');
  await expect(page.getByRole('link', { name: 'EN', exact: true })).toHaveAttribute('href', /\/en\/projects\/example-audio\//);
});
