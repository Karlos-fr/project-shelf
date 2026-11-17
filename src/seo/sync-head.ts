// ============================================================================
// SyncHead — Synchronisation des métadonnées après navigation cliente
// ----------------------------------------------------------------------------
// Ce module applique SeoModel au document courant, y compris sa langue. Les mêmes
// règles canonical/hreflang restent calculées par buildSeo pour SSR et navigation.
// ============================================================================
import type { SeoModel } from './model.ts';
import { serializeJsonLd } from './structured-data.ts';

// ----------------------------------------------------------------------------
// Applique titre, description, robots, canonical, hreflang et Open Graph.
// Paramètres : model provient de buildSeo ; doc facilite les tests sans global caché.
// Effets de bord : modifie la langue HTML et les balises ProjectShelf dans head.
// ----------------------------------------------------------------------------
export function syncHead(model: SeoModel, structuredData: readonly Record<string, unknown>[] = [], doc: Document = document): void {
  doc.documentElement.lang = model.lang;
  doc.title = model.title;
  setMeta(doc, 'description', model.description);
  setMeta(doc, 'robots', model.robots);
  setProperty(doc, 'og:title', model.title);
  setProperty(doc, 'og:description', model.description);
  setProperty(doc, 'og:url', model.canonical);
  setProperty(doc, 'og:locale', model.openGraphLocale);
  setLink(doc, 'canonical', null, model.canonical);
  removeAlternateLinks(doc);
  for (const alternate of model.alternates) setLink(doc, 'alternate', alternate.lang, alternate.href);
  if (model.image === undefined) removeProperty(doc, 'og:image'); else setProperty(doc, 'og:image', model.image);
  setMeta(doc, 'twitter:card', model.image === undefined ? 'summary' : 'summary_large_image');
  replaceStructuredData(doc, structuredData);
}

// ----------------------------------------------------------------------------
// Remplace les JSON-LD appartenant à ProjectShelf sans toucher aux scripts tiers.
// Paramètres : entries provient du même détail public que la fiche courante.
// Effets de bord : retire les anciens scripts possédés puis ajoute les nouveaux.
// ----------------------------------------------------------------------------
function replaceStructuredData(doc: Document, entries: readonly Record<string, unknown>[]): void {
  for (const element of doc.head.querySelectorAll('script[type=\"application/ld+json\"][data-project-shelf-structured]')) element.remove();
  for (const entry of entries) {
    const script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.projectShelfStructured = '';
    script.textContent = serializeJsonLd(entry);
    doc.head.append(script);
  }
}

// ----------------------------------------------------------------------------
// Crée ou met à jour une meta identifiée par son attribut name.
// ----------------------------------------------------------------------------
function setMeta(doc: Document, name: string, content: string): void {
  let element = doc.head.querySelector<HTMLMetaElement>(`meta[name="${cssEscape(name)}"][data-project-shelf-seo]`);
  if (element === null) {
    element = doc.createElement('meta');
    element.name = name;
    element.dataset.projectShelfSeo = '';
    doc.head.append(element);
  }
  element.content = content;
}

// ----------------------------------------------------------------------------
// Crée ou met à jour une meta Open Graph identifiée par property.
// ----------------------------------------------------------------------------
function setProperty(doc: Document, property: string, content: string): void {
  let element = doc.head.querySelector<HTMLMetaElement>(`meta[property="${cssEscape(property)}"][data-project-shelf-seo]`);
  if (element === null) {
    element = doc.createElement('meta');
    element.setAttribute('property', property);
    element.dataset.projectShelfSeo = '';
    doc.head.append(element);
  }
  element.content = content;
}

// ----------------------------------------------------------------------------
// Supprime une propriété Open Graph devenue non applicable à la route.
// ----------------------------------------------------------------------------
function removeProperty(doc: Document, property: string): void {
  doc.head.querySelector(`meta[property="${cssEscape(property)}"][data-project-shelf-seo]`)?.remove();
}

// ----------------------------------------------------------------------------
// Crée ou met à jour canonical ou alternate avec hreflang facultatif.
// ----------------------------------------------------------------------------
function setLink(doc: Document, rel: string, hreflang: string | null, href: string): void {
  const selector = hreflang === null
    ? `link[rel="${rel}"][data-project-shelf-seo]`
    : `link[rel="${rel}"][hreflang="${cssEscape(hreflang)}"][data-project-shelf-seo]`;
  let element = doc.head.querySelector<HTMLLinkElement>(selector);
  if (element === null) {
    element = doc.createElement('link');
    element.rel = rel;
    element.dataset.projectShelfSeo = '';
    if (hreflang !== null) element.hreflang = hreflang;
    doc.head.append(element);
  }
  element.href = href;
}

// ----------------------------------------------------------------------------
// Retire les alternates de l'ancienne route avant d'émettre la nouvelle liste.
// ----------------------------------------------------------------------------
function removeAlternateLinks(doc: Document): void {
  for (const element of doc.head.querySelectorAll('link[rel="alternate"][data-project-shelf-seo]')) element.remove();
}

// ----------------------------------------------------------------------------
// Échappe une valeur fermée utilisée dans un sélecteur d'attribut CSS.
// ----------------------------------------------------------------------------
function cssEscape(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
