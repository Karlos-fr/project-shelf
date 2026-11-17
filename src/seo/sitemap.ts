// ============================================================================
// Sitemap — Génération XML des accueils et fiches indexables
// ----------------------------------------------------------------------------
// Le sitemap contient seulement des URL propres pré-générées. Les paramètres de
// recherche, prévisualisations, 404 et fiches noindex n'y sont jamais ajoutés.
// ============================================================================
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { PublicProject } from '../domain/project.ts';
import { formatRoute } from '../domain/routes.ts';

// Entête XML fixe de la norme Sitemap ; aucune donnée éditoriale n'y est injectée.
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

// ----------------------------------------------------------------------------
// Construit le sitemap d'un build de production.
// Paramètres : config fournit origine/base ; projects contient les détails publics.
// Retour : document XML déterministe ; en preview la liste reste volontairement vide.
// ----------------------------------------------------------------------------
export function buildSitemap(config: SiteConfig, projects: readonly PublicProject[]): string {
  const urls: string[] = [];
  if (config.mode === 'production') {
    urls.push(urlEntry(homeUrl(config, 'en')), urlEntry(homeUrl(config, 'fr')));
    for (const project of projects) {
      if (!project.indexable) continue;
      urls.push(urlEntry(projectUrl(config, project, 'en'), project.pageUpdatedAt?.en));
      urls.push(urlEntry(projectUrl(config, project, 'fr'), project.pageUpdatedAt?.fr));
    }
  }
  return `${XML_HEADER}\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// ----------------------------------------------------------------------------
// Produit l'URL absolue d'un accueil localisé.
// ----------------------------------------------------------------------------
function homeUrl(config: SiteConfig, locale: Locale): string {
  const path = formatRoute({ locale, projectId: null, categories: [], sort: 'updated', q: '' }, config.base);
  return new URL(path, `${config.origin}/`).href;
}

// ----------------------------------------------------------------------------
// Produit l'URL absolue d'une fiche localisée.
// ----------------------------------------------------------------------------
function projectUrl(config: SiteConfig, project: PublicProject, locale: Locale): string {
  const path = formatRoute({ locale, projectId: project.id, categories: [], sort: 'updated', q: '' }, config.base);
  return new URL(path, `${config.origin}/`).href;
}

// ----------------------------------------------------------------------------
// Sérialise une entrée Sitemap avec lastmod uniquement lorsqu'il est fourni.
// ----------------------------------------------------------------------------
function urlEntry(url: string, lastmod?: string): string {
  const suffix = lastmod === undefined ? '' : `<lastmod>${escapeXml(lastmod)}</lastmod>`;
  return `  <url><loc>${escapeXml(url)}</loc>${suffix}</url>`;
}

// ----------------------------------------------------------------------------
// Échappe les caractères XML réservés même si les URL et dates sont déjà validées.
// ----------------------------------------------------------------------------
function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
