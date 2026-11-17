// ============================================================================
// RobotsEndpoint — Endpoint statique de politique d'exploration
// ----------------------------------------------------------------------------
// Cette route reflète seulement le mode du build. Sur un déploiement sous
// préfixe, la recette T13 doit encore vérifier le robots.txt à la racine réelle.
// ============================================================================
import type { APIRoute } from 'astro';
import { loadSiteConfig } from '../config/site.ts';
import { buildRobots } from '../seo/robots.ts';

// ----------------------------------------------------------------------------
// Retourne robots.txt avec sitemap seulement pour un build de production.
// ----------------------------------------------------------------------------
export const GET: APIRoute = () => {
  const config = loadSiteConfig(process.env);
  return new Response(buildRobots(config), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
