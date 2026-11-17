// ============================================================================
// SiteTests — Contrats de configuration dans le harnais Vitest prévu
// ----------------------------------------------------------------------------
// Ces tests exercent le vrai module sans lire l'environnement ou effectuer de requête.
// Ils complètent les contrôles natifs de bootstrap ; ils ne testent pas l'export.
// ============================================================================
import { expect, it } from 'vitest';
import { loadSiteConfig } from '../../src/config/site';

// ----------------------------------------------------------------------------
// Refuse une production sans domaine pour éviter des métadonnées inventées.
// ----------------------------------------------------------------------------
it('exige une origine explicite en production', function productionOriginRequired() {
  expect(() => loadSiteConfig({ SITE_MODE: 'production' })).toThrow('SITE_ORIGIN');
});

// ----------------------------------------------------------------------------
// Conserve les préfixes hors de l'origine afin de ne pas les doubler dans les URL.
// ----------------------------------------------------------------------------
it('normalise le montage séparément de l origine', function independentBase() {
  // Domaine fictif explicitement réservé à cette vérification hors réseau.
  const config = loadSiteConfig({ SITE_MODE: 'production', SITE_ORIGIN: 'https://example.test', SITE_BASE: '/shelf', SITE_FIXTURE: 'true' });
  expect(config.origin).toBe('https://example.test');
  expect(config.base).toBe('/shelf/');
});

// ----------------------------------------------------------------------------
// Refuse les segments que le navigateur pourrait normaliser vers une autre route.
// ----------------------------------------------------------------------------
it('rejette les traversées encodées et les origines avec identifiants', function rejectUnsafeInputs() {
  expect(() => loadSiteConfig({ SITE_BASE: '/%2e%2e/' })).toThrow('SITE_BASE');
  expect(() => loadSiteConfig({ SITE_ORIGIN: 'https://user:secret@example.test' })).toThrow('SITE_ORIGIN');
});
