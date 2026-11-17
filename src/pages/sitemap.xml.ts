// ============================================================================
// SitemapEndpoint — Endpoint statique du sitemap public
// ----------------------------------------------------------------------------
// Cette route sérialise uniquement le catalogue assaini et le modèle Sitemap.
// Elle ne lit jamais projects.ts et n'ajoute aucun paramètre de galerie.
// ============================================================================
import type { APIRoute } from 'astro';
import { loadSiteConfig } from '../config/site.ts';
import { loadPublishedCatalogue } from '../data/published.ts';
import { buildSitemap } from '../seo/sitemap.ts';

// ----------------------------------------------------------------------------
// Retourne le sitemap déterministe du build courant.
// Effets de bord : lit uniquement le catalogue public généré avant Astro.
// ----------------------------------------------------------------------------
export const GET: APIRoute = async () => {
  const config = loadSiteConfig(process.env);
  const catalogue = await loadPublishedCatalogue();
  const xml = buildSitemap(config, Object.values(catalogue.details));
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
