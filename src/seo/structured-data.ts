// ============================================================================
// StructuredData — JSON-LD factuel des applications et vidéos de projet
// ----------------------------------------------------------------------------
// Ce module n'émet que les types dont les métadonnées nécessaires sont présentes.
// Il n'invente ni prix, avis, note, uploadDate ni caractéristique non publiée.
// ============================================================================
import type { SiteConfig } from '../config/site.ts';
import type { Locale } from '../domain/locale.ts';
import type { PublicProject, VideoMedia } from '../domain/project.ts';
import { assetUrl, formatRoute } from '../domain/routes.ts';

// ----------------------------------------------------------------------------
// Construit les objets JSON-LD adaptés à une fiche publique et une langue.
// Paramètres : project contient les données visibles ; locale sélectionne les textes ;
// config fournit l'origine et le préfixe du build.
// Retour : liste vide ou objets SoftwareApplication/VideoObject indépendants.
// ----------------------------------------------------------------------------
export function buildStructuredData(project: PublicProject, locale: Locale, config: SiteConfig): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = [];
  if (project.application !== undefined) data.push(applicationData(project, locale, config));
  for (const media of project.media) {
    if (media.type === 'video' && isCompleteVideo(media)) data.push(videoData(project, media, locale, config));
  }
  return data;
}

// ----------------------------------------------------------------------------
// Produit un SoftwareApplication sans information commerciale ou réputationnelle.
// ----------------------------------------------------------------------------
function applicationData(project: PublicProject, locale: Locale, config: SiteConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: project.name,
    description: project.content[locale].description,
    url: projectUrl(project, locale, config),
    applicationCategory: project.application?.category,
    dateCreated: project.createdAt,
    dateModified: project.updatedAt,
  };
  if (project.application?.operatingSystems !== undefined) {
    result.operatingSystem = [...project.application.operatingSystems];
  }
  return result;
}

// ----------------------------------------------------------------------------
// Indique si une vidéo possède les champs minimaux nécessaires au balisage VideoObject.
// ----------------------------------------------------------------------------
function isCompleteVideo(media: VideoMedia): boolean {
  return media.uploadDate !== undefined && media.description !== undefined;
}

// ----------------------------------------------------------------------------
// Produit un VideoObject depuis une vidéo réellement consultable sur la fiche.
// ----------------------------------------------------------------------------
function videoData(project: PublicProject, media: VideoMedia, locale: Locale, config: SiteConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: media.title[locale],
    description: media.description?.[locale],
    thumbnailUrl: absoluteAsset(media.thumbnail ?? media.poster, config),
    uploadDate: media.uploadDate,
    contentUrl: absoluteAsset(media.src, config),
    url: projectUrl(project, locale, config),
  };
  if (media.durationSeconds !== undefined) result.duration = isoDuration(media.durationSeconds);
  return result;
}

// ----------------------------------------------------------------------------
// Produit l'URL propre d'une fiche sans filtres de galerie.
// ----------------------------------------------------------------------------
function projectUrl(project: PublicProject, locale: Locale, config: SiteConfig): string {
  const path = formatRoute({ locale, projectId: project.id, categories: [], sort: 'updated', q: '' }, config.base);
  return new URL(path, `${config.origin}/`).href;
}

// ----------------------------------------------------------------------------
// Résout une source de média locale ou distante en URL absolue pour JSON-LD.
// ----------------------------------------------------------------------------
function absoluteAsset(src: string, config: SiteConfig): string {
  const value = assetUrl(src, config.base);
  return /^https:\/\//iu.test(value) ? value : new URL(value, `${config.origin}/`).href;
}

// ----------------------------------------------------------------------------
// Convertit une durée positive en représentation ISO 8601 exprimée en secondes.
// ----------------------------------------------------------------------------
function isoDuration(seconds: number): string {
  return `PT${Number.isInteger(seconds) ? seconds.toFixed(0) : String(seconds)}S`;
}

// ----------------------------------------------------------------------------
// Sérialise un objet JSON-LD pour une balise script insérée telle quelle en HTML.
// Paramètres : entry provient de buildStructuredData ; retour : JSON équivalent.
// Sécurité : < > & et les séparateurs U+2028/U+2029 sont échappés en \uXXXX afin
// qu'un texte éditorial contenant </script> ne ferme jamais la balise.
// ----------------------------------------------------------------------------
export function serializeJsonLd(entry: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(entry).replace(/[<>&\u2028\u2029]/gu, escapeJsonCharacter);
}

// ----------------------------------------------------------------------------
// Remplace un caractère sensible par son échappement Unicode JSON.
// ----------------------------------------------------------------------------
function escapeJsonCharacter(character: string): string {
  return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
}
