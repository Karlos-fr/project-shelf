// ============================================================================
// ShowcaseRoutes — Adresses localisées et état partageable de la galerie
// ----------------------------------------------------------------------------
// Ce module ne touche ni history ni le DOM. Il distingue une route inconnue d'un
// accueil et ne sérialise que les critères publics définis par le produit.
// ============================================================================
import type { Locale } from './locale.ts';
import { normalizeBasePath } from './paths.ts';
import { isSlug, isSafeHttpsUrl, isLocalMediaPath, decodePathSegment } from './validation.ts';

export type GalleryState = { categories: string[]; sort: 'updated' | 'created'; q: string };
export type RouteState = GalleryState & { locale: Locale; projectId: string | null };

// ----------------------------------------------------------------------------
// Lit une URL déjà analysée sans inventer d'accueil pour une syntaxe inconnue.
// Paramètres : url est l'adresse courante ; base le montage ; categoryIds la liste
// des seules catégories publiées. La disponibilité d'un id projet relève du chargeur.
// Retour : état public normalisé, ou null pour une route hors contrat.
// ----------------------------------------------------------------------------
export function parseRoute(url: URL, base: string, categoryIds: readonly string[]): RouteState | null {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  // La configuration est validée hors du traitement d'une route inconnue.
  const prefix = normalizeBasePath(base);
  let pathname: string;
  try { pathname = normalizeBasePath(url.pathname); } catch { return null; }
  if (!pathname.startsWith(prefix)) return null;
  // Le préfixe inclut sa barre finale : /shelf/ ne correspond pas à /shelfish/.
  const segments = pathname.slice(prefix.length).split('/').filter(Boolean);
  let locale: Locale = 'en';
  let projectId: string | null = null;
  if (segments.length > 0) {
    if (segments[0] !== 'en' && segments[0] !== 'fr') return null;
    locale = segments[0];
    // La présence du segment est contrôlée indépendamment de sa validité sémantique.
    const candidate = segments[2];
    if (segments.length === 3 && segments[1] === 'projects' && candidate !== undefined && isSlug(candidate)) projectId = candidate;
    else if (segments.length !== 1) return null;
  }
  // Les catégories inconnues ne quittent pas la frontière de navigation.
  const known = new Set(categoryIds);
  // Plusieurs paramètres categories sont tolérés, sans publier leurs doublons.
  const selected = new Set<string>();
  // Les tokens restent des identifiants ; les traductions ne participent pas à l'URL.
  for (const group of url.searchParams.getAll('categories')) {
    // Le contrat d'URL combine les catégories en une liste séparée par des virgules.
    for (const id of group.split(',')) if (known.has(id) && isSlug(id)) selected.add(id);
  }
  return {
    locale, projectId, categories: [...selected].sort(),
    sort: url.searchParams.get('sort') === 'created' ? 'created' : 'updated',
    q: (url.searchParams.get('q') ?? '').trim(),
  };
}

// ----------------------------------------------------------------------------
// Produit un lien localisé canonique, sans paramètres internes ou critères vides.
// Paramètres : route contient les critères publics ; base le montage statique.
// Retour : chemin relatif à l'origine avec préfixe, barre finale et requête encodée.
// Erreurs : refuse un id projet, une catégorie ou une langue non conformes.
// ----------------------------------------------------------------------------
export function formatRoute(route: RouteState, base: string): string {
  if (route.locale !== 'en' && route.locale !== 'fr') throw new Error('Langue de route invalide.');
  if (route.projectId !== null && !isSlug(route.projectId)) throw new Error('Identifiant de projet invalide.');
  if (!route.categories.every(isSlug)) throw new Error('Catégorie de route invalide.');
  // Le tri lexical des identifiants rend l'adresse indépendante de l'ordre des clics.
  const categories = [...new Set(route.categories)].sort();
  // Seules les clés appartenant au contrat sont émises.
  const query = new URLSearchParams();
  if (categories.length) query.set('categories', categories.join(','));
  if (route.sort === 'created') query.set('sort', 'created');
  if (route.q.trim()) query.set('q', route.q.trim());
  // Le suffixe de projet reste identique dans les deux langues.
  const detail = route.projectId === null ? '' : `projects/${route.projectId}/`;
  // URLSearchParams échappe les caractères réservés, y compris les fragments saisis.
  const suffix = query.size ? `?${query}` : '';
  return `${normalizeBasePath(base)}${route.locale}/${detail}${suffix}`;
}

// ----------------------------------------------------------------------------
// Résout un média logique sous le montage ou conserve une URL HTTPS externe.
// Paramètres : src est la source publiée ; base le préfixe de déploiement.
// Retour : URL de média sûre ; aucun média distant n'est téléchargé.
// Erreurs : refuse les adresses non conformes avant tout rendu de lien.
// ----------------------------------------------------------------------------
export function assetUrl(src: string, base: string): string {
  if (isSafeHttpsUrl(src)) return src;
  if (!isLocalMediaPath(src)) throw new Error('Source de média invalide.');
  return `${normalizeBasePath(base)}${src.slice(1).split('/').map(canonicalAssetSegment).join('/')}`;
}

// ----------------------------------------------------------------------------
// Encode un segment de média déjà vérifié en conservant un décodage unique.
// Paramètres : raw est un segment du chemin logique, pas une URL complète.
// Retour : segment encodé selon la même convention que le montage.
// ----------------------------------------------------------------------------
function canonicalAssetSegment(raw: string): string {
  // La validation de la source garantit l'existence du segment décodé.
  const decoded = decodePathSegment(raw);
  if (decoded === null) throw new Error('Segment de média invalide.');
  return encodeURIComponent(decoded);
}
