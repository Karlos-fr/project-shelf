// ============================================================================
// Robots — Politique robots.txt dérivée du mode de build
// ----------------------------------------------------------------------------
// Ce module produit un texte déterministe sans supposer qu'un préfixe de site
// remplace le robots.txt de la racine d'origine sur un hébergement réel.
// ============================================================================
import type { SiteConfig } from '../config/site.ts';

// ----------------------------------------------------------------------------
// Construit robots.txt pour production ou prévisualisation.
// Paramètres : config fournit origine, base et mode déjà validés.
// Retour : texte UTF-8 terminé par une nouvelle ligne.
// ----------------------------------------------------------------------------
export function buildRobots(config: SiteConfig): string {
  if (config.mode === 'preview') return 'User-agent: *\nDisallow: /\n';
  const sitemap = new URL(`${config.base}sitemap.xml`, `${config.origin}/`).href;
  return `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`;
}
