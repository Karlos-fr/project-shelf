// ============================================================================
// XpApps — Ce que lance chaque raccourci du bureau XP de la chambre
// ----------------------------------------------------------------------------
// Fonction pure, calculée au build : un projet qui a une démo en ligne s'ouvre dans
// Internet Explorer, sauf une démo marquée window dans le catalogue (le Démineur), qui a
// sa propre fenêtre ; sinon sa vidéo passe dans le Lecteur Windows Media ; à défaut,
// Internet Explorer affiche son site ou sa fiche. Les catégories deviennent les
// dossiers de « Mes documents ».
// ============================================================================
import type { Locale } from '../domain/locale.ts';
import type { Category, PublicProject } from '../domain/project.ts';
import { assetUrl, formatRoute } from '../domain/routes.ts';

type XpAppBase = { id: string; name: string; icon: string };
export type XpBrowserApp = XpAppBase & { kind: 'browser'; url: string };
export type XpPlayerApp = XpAppBase & { kind: 'player'; video: string; poster: string };
// Programme dans sa propre fenêtre, sans navigateur autour.
export type XpWindowApp = XpAppBase & { kind: 'window'; url: string };
export type XpApp = XpBrowserApp | XpPlayerApp | XpWindowApp;

export type XpFolder = { id: string; label: string; appIds: string[] };
export type XpCatalog = { apps: Record<string, XpApp>; order: string[]; folders: XpFolder[] };

// ----------------------------------------------------------------------------
// Construit le catalogue du bureau XP.
// Paramètres : projects dans l'ordre d'affichage ; categories du catalogue ; base de déploiement.
// Retour : applications par identifiant, ordre des icônes et dossiers par catégorie.
// ----------------------------------------------------------------------------
export function buildXpCatalog(projects: readonly PublicProject[], categories: readonly Category[], locale: Locale, base: string): XpCatalog {
  const apps: Record<string, XpApp> = {};
  for (const project of projects) {
    const common = { id: project.id, name: project.name, icon: assetUrl(project.preview.poster, base) };
    const demo = project.links.find((link) => link.type === 'demo');
    const video = project.media.find((media) => media.type === 'video');
    const website = project.links.find((link) => link.type === 'website');
    if (demo !== undefined) {
      apps[project.id] = { ...common, kind: demo.window === true ? 'window' : 'browser', url: demo.url };
    } else if (video !== undefined) {
      apps[project.id] = { ...common, kind: 'player', video: assetUrl(video.src, base), poster: assetUrl(video.poster, base) };
    } else if (project.preview.video !== undefined) {
      apps[project.id] = { ...common, kind: 'player', video: assetUrl(project.preview.video, base), poster: common.icon };
    } else {
      const url = website?.url ?? formatRoute({ locale, projectId: project.id, categories: [], sort: 'updated', q: '' }, base);
      apps[project.id] = { ...common, kind: 'browser', url };
    }
  }
  const order = projects.map((project) => project.id);
  const folders = categories
    .map((category) => ({
      id: category.id,
      label: category.label[locale],
      appIds: projects.filter((project) => project.categories.includes(category.id)).map((project) => project.id),
    }))
    .filter((folder) => folder.appIds.length > 0);
  return { apps, order, folders };
}
