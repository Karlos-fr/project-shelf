// ============================================================================
// SeoModel — Métadonnées communes au HTML pré-généré et à la navigation cliente
// ----------------------------------------------------------------------------
// Ce module calcule canonical, alternates et textes SEO depuis la configuration et
// les seules données publiques. Il ne modifie pas document.head et n'émet pas de HTML.
// ============================================================================
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { PublicProject } from '../domain/project.ts';
import { assetUrl, formatRoute, type RouteState } from '../domain/routes.ts';

export type SeoAlternate = { lang: Locale | 'x-default'; href: string };

export type SeoModel = {
  lang: Locale;
  title: string;
  description: string;
  canonical: string;
  alternates: SeoAlternate[];
  robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  image?: string;
  openGraphLocale: 'en_US' | 'fr_FR';
};

// ----------------------------------------------------------------------------
// Construit les métadonnées d'une page propre à partir d'une route éventuellement filtrée.
// Paramètres : config fournit origine/base/mode ; route l'état courant ; project le détail
// public lorsque la route désigne une fiche.
// Retour : modèle sérialisable identique pour Astro et la synchronisation cliente.
// ----------------------------------------------------------------------------
export function buildSeo(config: SiteConfig, route: RouteState, project?: PublicProject): SeoModel {
  const cleanRoute = cleanSeoRoute(route);
  const canonical = absoluteRoute(config, cleanRoute);
  const content = project?.content[route.locale];
  const title = project === undefined
    ? homeTitle(config.name, route.locale)
    : (content?.seo?.title ?? `${project.name} — ${content?.tagline ?? config.name}`);
  const description = project === undefined
    ? config.intro[route.locale]
    : (content?.seo?.description ?? content?.description ?? config.intro[route.locale]);
  const model: SeoModel = {
    lang: route.locale,
    title,
    description,
    canonical,
    alternates: alternates(config, cleanRoute, project),
    robots: robots(config, project),
    openGraphLocale: route.locale === 'fr' ? 'fr_FR' : 'en_US',
  };
  if (project !== undefined) {
    const image = content?.seo?.image ?? project.preview.poster;
    model.image = absoluteAsset(config, image);
  }
  return model;
}

// ----------------------------------------------------------------------------
// Retire les critères de galerie afin que canonical et hreflang pointent vers les pages propres.
// ----------------------------------------------------------------------------
function cleanSeoRoute(route: RouteState): RouteState {
  return { locale: route.locale, projectId: route.projectId, categories: [], sort: 'updated', q: '' };
}

// ----------------------------------------------------------------------------
// Produit le titre localisé de l'accueil sans stocker un second catalogue éditorial.
// ----------------------------------------------------------------------------
function homeTitle(name: string, locale: Locale): string {
  return locale === 'fr' ? `${name} — Projets` : `${name} — Projects`;
}

// ----------------------------------------------------------------------------
// Calcule la politique d'indexation selon le mode et la fiche publique.
// ----------------------------------------------------------------------------
function robots(config: SiteConfig, project?: PublicProject): SeoModel['robots'] {
  if (config.mode === 'preview') return 'noindex,nofollow';
  if (project !== undefined && !project.indexable) return 'noindex,follow';
  return 'index,follow';
}

// ----------------------------------------------------------------------------
// Calcule les versions EN/FR et x-default lorsque la page est autorisée à l'indexation.
// ----------------------------------------------------------------------------
function alternates(config: SiteConfig, route: RouteState, project?: PublicProject): SeoAlternate[] {
  if (config.mode === 'preview' || (project !== undefined && !project.indexable)) return [];
  const english = absoluteRoute(config, { ...route, locale: 'en' });
  const french = absoluteRoute(config, { ...route, locale: 'fr' });
  return [
    { lang: 'en', href: english },
    { lang: 'fr', href: french },
    { lang: 'x-default', href: english },
  ];
}

// ----------------------------------------------------------------------------
// Résout une route locale propre sous l'origine validée du build.
// ----------------------------------------------------------------------------
function absoluteRoute(config: SiteConfig, route: RouteState): string {
  return new URL(formatRoute(route, config.base), `${config.origin}/`).href;
}

// ----------------------------------------------------------------------------
// Résout une image locale sous base ou conserve sa source HTTPS externe.
// ----------------------------------------------------------------------------
function absoluteAsset(config: SiteConfig, src: string): string {
  const resolved = assetUrl(src, config.base);
  return /^https:\/\//iu.test(resolved) ? resolved : new URL(resolved, `${config.origin}/`).href;
}
