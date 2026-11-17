// ============================================================================
// ShellBuildTests — Inspection des documents réellement exportés par Astro
// ----------------------------------------------------------------------------
// Ces tests nécessitent npm run build et échouent si dist manque.
// Lire les fichiers source .astro ne constitue pas un remplacement de cette preuve.
// ============================================================================
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { expect, it } from 'vitest';

// ----------------------------------------------------------------------------
// Vérifie le contenu initial de l'accueil de recette et son indexation production.
// ----------------------------------------------------------------------------
it('produit un accueil anglais lisible sans client', async function builtHome() {
  // HTML compilé réel ; une absence de fichier doit conserver l'échec du test.
  const html = await readFile('dist/index.html', 'utf8');
  const $ = load(html);
  expect($('html').attr('lang')).toBe('en');
  expect(html).toContain('ProjectShelf');
  expect($('h1').length).toBeGreaterThan(0);
  expect($('meta[name="robots"]').attr('content')).toBe('index,follow');
});

// ----------------------------------------------------------------------------
// Vérifie la production de la page d'erreur ; le statut HTTP est testé en E2E.
// ----------------------------------------------------------------------------
it('exporte un document 404 distinct', async function builtNotFound() {
  // Astro réserve 404.html au traitement natif des erreurs des hébergeurs statiques.
  const html = await readFile('dist/404.html', 'utf8');
  const $ = load(html);
  expect(html).toContain('Page not found');
  expect($('meta[name="robots"]').attr('content')).toBe('noindex,nofollow');
});
