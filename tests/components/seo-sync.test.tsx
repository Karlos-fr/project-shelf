// @vitest-environment jsdom
// ============================================================================
// SeoSyncComponentTests — Synchronisation du document lors d'une navigation
// ----------------------------------------------------------------------------
// Ces tests vérifient les attributs hors de la racine React après un changement
// de route. Ils ne recalculent ni le modèle SEO ni les URL canoniques.
// ============================================================================
import { expect, it } from 'vitest';
import type { SeoModel } from '../../src/seo/model.ts';
import { syncHead } from '../../src/seo/sync-head.ts';

// Modèle français minimal appliqué au document synthétique de jsdom.
const FRENCH_MODEL: SeoModel = {
  lang: 'fr',
  title: 'Projets',
  description: 'Vitrine de projets',
  canonical: 'https://example.test/fr/',
  alternates: [],
  robots: 'index,follow',
  openGraphLocale: 'fr_FR',
};

// ----------------------------------------------------------------------------
// Vérifie que la langue du document suit la route cliente, hors de la racine React.
// ----------------------------------------------------------------------------
it('met à jour la langue HTML lors du changement de route', () => {
  document.documentElement.lang = 'en';

  syncHead(FRENCH_MODEL, [], document);

  expect(document.documentElement.lang).toBe('fr');
});
