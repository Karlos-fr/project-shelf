// ============================================================================
// ShellBrowserTests — Contrats HTTP et accès sans JavaScript
// ----------------------------------------------------------------------------
// Ces tests utilisent le serveur Astro et un vrai navigateur installé séparément.
// Une lecture de sources ou une injection de HTML ne suffit pas à les valider.
// ============================================================================
import { test, expect } from '@playwright/test';

// ----------------------------------------------------------------------------
// Vérifie que le HTML initial contient identité et SEO production sans JavaScript.
// Paramètres : browser est le navigateur isolé fourni par Playwright.
// Effets de bord : ouvre puis ferme un contexte sans JavaScript.
// ----------------------------------------------------------------------------
test('rend l identité sans JavaScript', async function noJavaScript({ browser }) {
  // Contexte propre, sans script ni état hérité d'un autre test.
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    // Page servie par Astro, sans substitution des réponses réseau.
    const page = await context.newPage();
    // Réponse réelle du serveur ; son code est vérifié indépendamment du DOM.
    const response = await page.goto('http://127.0.0.1:4321/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('link', { name: 'ProjectShelf' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Games, apps, and experiments.');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://example.test/en/');
  } finally {
    await context.close();
  }
});

// ----------------------------------------------------------------------------
// Vérifie qu'une adresse inconnue n'est pas convertie en accueil avec succès HTTP.
// Paramètres : page est une page isolée gérée par le harnais.
// ----------------------------------------------------------------------------
test('retourne réellement 404 pour une adresse inconnue', async function realHttpError({ page }) {
  // Adresse volontairement absente de toutes les routes du socle.
  const response = await page.goto('/this-project-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});
