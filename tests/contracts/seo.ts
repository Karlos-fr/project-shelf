// ============================================================================
// SeoCases — Contrats SEO bilingues calculés depuis les données publiques
// ----------------------------------------------------------------------------
// Ces scénarios vérifient canonical, alternates, sitemap et JSON-LD sans Astro.
// Ils n'interrogent aucun moteur de recherche et n'inventent aucun enrichissement.
// ============================================================================
import assert from 'node:assert/strict';
import { buildSeo } from '../../src/seo/model.ts';
import { buildStructuredData, serializeJsonLd } from '../../src/seo/structured-data.ts';
import { buildSitemap } from '../../src/seo/sitemap.ts';
import { buildRobots } from '../../src/seo/robots.ts';
import type { PublicProject } from '../../src/domain/project.ts';
import type { SiteConfig } from '../../src/config/site.ts';
import type { RegisterCase } from './validation.ts';

// ----------------------------------------------------------------------------
// Enregistre les scénarios SEO auprès du runner actif.
// ----------------------------------------------------------------------------
export function registerSeoTests(register: RegisterCase): void {
  register('retire les filtres de la canonical projet', canonicalCase);
  register('utilise anglais comme x-default', alternateCase);
  register('marque une fiche non indexable en noindex', noindexCase);
  register('utilise une image SEO puis le poster en repli', imageCase);
  register('sitemap exclut fiches non indexables et critères', sitemapCase);
  register('SoftwareApplication reste factuel', applicationStructuredDataCase);
  register('VideoObject exige les métadonnées nécessaires', videoStructuredDataCase);
  register('robots distingue production et preview', robotsCase);
  register('JSON-LD ne peut pas fermer sa balise script', jsonLdEscapeCase);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une URL partageable filtrée pointe vers une canonical propre.
// ----------------------------------------------------------------------------
function canonicalCase(): void {
  const model = buildSeo(config(), {
    locale: 'fr', projectId: 'example-audio', categories: ['audio'], sort: 'created', q: 'x',
  }, project());
  assert.equal(model.canonical, 'https://example.test/fr/projects/example-audio/');
}

// ----------------------------------------------------------------------------
// Vérifie les trois alternates linguistiques stables.
// ----------------------------------------------------------------------------
function alternateCase(): void {
  const model = buildSeo(config(), {
    locale: 'fr', projectId: 'example-audio', categories: [], sort: 'updated', q: '',
  }, project());
  assert.deepEqual(model.alternates, [
    { lang: 'en', href: 'https://example.test/en/projects/example-audio/' },
    { lang: 'fr', href: 'https://example.test/fr/projects/example-audio/' },
    { lang: 'x-default', href: 'https://example.test/en/projects/example-audio/' },
  ]);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une fiche publique peut rester volontairement hors index.
// ----------------------------------------------------------------------------
function noindexCase(): void {
  const source = project();
  source.indexable = false;
  const model = buildSeo(config(), {
    locale: 'en', projectId: source.id, categories: [], sort: 'updated', q: '',
  }, source);
  assert.equal(model.robots, 'noindex,follow');
}

// ----------------------------------------------------------------------------
// Vérifie la priorité d'image éditoriale et le repli vers le poster de carte.
// ----------------------------------------------------------------------------
function imageCase(): void {
  const source = project();
  source.content.en.seo = { image: '/media/share.webp' };
  const route = { locale: 'en' as const, projectId: source.id, categories: [], sort: 'updated' as const, q: '' };
  assert.equal(buildSeo(config(), route, source).image, 'https://example.test/media/share.webp');
  delete source.content.en.seo;
  assert.equal(buildSeo(config(), route, source).image, 'https://example.test/media/poster.webp');
}

// ----------------------------------------------------------------------------
// Vérifie que le sitemap ne contient que les pages propres et indexables.
// ----------------------------------------------------------------------------
function sitemapCase(): void {
  const visible = project();
  visible.pageUpdatedAt = { en: '2026-09-03', fr: '2026-09-04' };
  const blocked = project({ id: 'blocked', indexable: false });
  const xml = buildSitemap(config(), [visible, blocked]);
  assert.match(xml, /https:\/\/example\.test\/en\/projects\/example-audio\//);
  assert.match(xml, /2026-09-03/);
  assert.match(xml, /2026-09-04/);
  assert.doesNotMatch(xml, /blocked|<loc>[^<]*\?|https:\/\/example\.test\/\/en\/projects/);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une application n'ajoute ni prix, ni note, ni avis artificiels.
// ----------------------------------------------------------------------------
function applicationStructuredDataCase(): void {
  const source = project();
  source.application = { category: 'MultimediaApplication', operatingSystems: ['Windows'] };
  const data = buildStructuredData(source, 'en', config());
  const serialized = JSON.stringify(data);
  assert.match(serialized, /SoftwareApplication/);
  assert.match(serialized, /MultimediaApplication/);
  assert.doesNotMatch(serialized, /aggregateRating|offers|price/);
}

// ----------------------------------------------------------------------------
// Vérifie qu'une vidéo complète produit VideoObject et qu'une date absente l'empêche.
// ----------------------------------------------------------------------------
function videoStructuredDataCase(): void {
  const source = project();
  source.media = [{
    type: 'video', src: 'https://cdn.example.test/demo.mp4', poster: '/media/video.webp',
    title: { en: 'Demo', fr: 'Démo' }, description: { en: 'Video demo', fr: 'Vidéo de démo' },
    uploadDate: '2026-09-02', durationSeconds: 7,
  }];
  const complete = buildStructuredData(source, 'en', config());
  assert.match(JSON.stringify(complete), /VideoObject/);
  delete (source.media[0] as { uploadDate?: string }).uploadDate;
  assert.doesNotMatch(JSON.stringify(buildStructuredData(source, 'en', config())), /VideoObject/);
}

// ----------------------------------------------------------------------------
// Produit la configuration publique synthétique utilisée par les tests SEO.
// ----------------------------------------------------------------------------
function config(): SiteConfig {
  return {
    origin: 'https://example.test', base: '/', mode: 'production', name: 'ProjectShelf',
    intro: { en: 'Games, apps, experiments.', fr: 'Jeux, applications, expérimentations.' },
    githubUrl: 'https://github.com/example',
  };
}

// ----------------------------------------------------------------------------
// Produit une fiche publique synthétique complète pour les calculs SEO.
// ----------------------------------------------------------------------------
function project(overrides: Partial<PublicProject> = {}): PublicProject {
  return {
    id: 'example-audio', name: 'Example Audio', categories: ['audio'],
    createdAt: '2026-09-01', updatedAt: '2026-09-02', status: 'active',
    repositoryVisibility: 'private', featured: true, stack: ['TypeScript'],
    preview: { poster: '/media/poster.webp' }, media: [], links: [], indexable: true,
    content: {
      en: { tagline: 'English tagline', description: 'English description', features: ['One'] },
      fr: { tagline: 'Accroche française', description: 'Description française', features: ['Un'] },
    },
    ...overrides,
  };
}


// ----------------------------------------------------------------------------
// Vérifie la politique robots sans confondre préfixe de site et racine d'origine.
// ----------------------------------------------------------------------------
function robotsCase(): void {
  const production = { ...config(), base: '/project-shelf/' };
  const productionText = buildRobots(production);
  assert.match(productionText, /User-agent: \*/);
  assert.match(productionText, /Allow: \//);
  assert.match(productionText, /Sitemap: https:\/\/example\.test\/project-shelf\/sitemap\.xml/);
  const previewText = buildRobots({ ...production, mode: 'preview' });
  assert.match(previewText, /Disallow: \//);
  assert.doesNotMatch(previewText, /Sitemap:/);
}

// ----------------------------------------------------------------------------
// Vérifie qu'un texte éditorial hostile reste inerte une fois inséré en HTML brut.
// ----------------------------------------------------------------------------
function jsonLdEscapeCase(): void {
  const entry = { description: '</script><script>alert(1)</script> & \u2028' };
  const serialized = serializeJsonLd(entry);
  assert.doesNotMatch(serialized, /[<>&\u2028]/u);
  assert.deepEqual(JSON.parse(serialized), entry);
}
