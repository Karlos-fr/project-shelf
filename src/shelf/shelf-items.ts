// ============================================================================
// ShelfItems — Objets d'époque posés sur l'étagère 3D
// ----------------------------------------------------------------------------
// Ce module associe chaque projet public à son objet physique (grande boîte PC,
// boîtier de disquette ou écran) et à ses jaquettes servies sous /shelf/. Il ne
// lit ni le catalogue brut ni le navigateur : la scène consomme ce résultat.
// ============================================================================
import type { ProjectSummary } from '../domain/project.ts';

// Tranche générée pour une boîte dont seule la face avant a été scannée.
export type ShelfSpine = { background: string; ink: string; title: string; subtitle: string };

// Boîte en carton ou boîtier : dimensions réelles en mètres (largeur, hauteur, profondeur).
export type ShelfBox = {
  kind: 'bigbox' | 'case';
  size: readonly [number, number, number];
  front: string;
  // Dos scanné, ou dos reconstitué à partir de captures du jeu.
  back: string | { screenshots: readonly string[]; background: string; ink: string; title: string; bullets: readonly string[]; footer: string };
  spine: string | ShelfSpine;
};

// Écran posé sur l'étagère : il affiche l'aperçu vidéo du projet.
export type ShelfScreen = { kind: 'tv' };

export type ShelfObject = ShelfBox | ShelfScreen;

export type ShelfItem = { project: ProjectSummary; object: ShelfObject };

// Objets connus, par identifiant de projet. Un projet absent n'a pas de place sur l'étagère.
export const SHELF_OBJECTS: Readonly<Record<string, ShelfObject>> = {
  'fun-tracks-recomp': {
    kind: 'bigbox', size: [0.24, 0.31, 0.068], front: 'funtracks-front.jpg',
    back: {
      screenshots: ['funtracks-shot1.jpg', 'funtracks-shot2.jpg', 'funtracks-shot3.jpg'], background: '#ffd21a', ink: '#d8231f',
      title: 'FUNTRACKS', bullets: ['7 circuits délirants', 'Jusqu’à 6 joueurs', 'Entièrement en français'], footer: 'Virgin Interactive · PC CD-ROM',
    },
    spine: { background: '#ffd21a', ink: '#d8231f', title: 'FUNTRACKS', subtitle: 'Virgin · PC CD-ROM' },
  },
  quake2js: {
    kind: 'bigbox', size: [0.225, 0.318, 0.068], front: 'quake-front.jpg', back: 'quake-back.jpg',
    spine: { background: '#2b2620', ink: '#c9c2b0', title: 'QUAKE II', subtitle: 'id Software · Activision' },
  },
  'la-mine-aux-diamants-web': {
    kind: 'case', size: [0.19, 0.248, 0.026], front: 'mine-front.jpg', back: 'mine-back.jpg', spine: 'mine-spine.jpg',
  },
  lactea: { kind: 'tv' },
  proscenium: { kind: 'tv' },
};

// ----------------------------------------------------------------------------
// Sélectionne les projets qui ont un objet d'étagère, dans l'ordre de la une.
// Paramètres : projects est la liste publique ; objects permet de tester un autre jeu d'objets.
// Retour : objets ordonnés par featuredOrder puis par nom, au plus `limit` éléments.
// ----------------------------------------------------------------------------
export function selectShelfItems(projects: readonly ProjectSummary[], objects = SHELF_OBJECTS, limit = 5): ShelfItem[] {
  return projects
    .filter((project) => Object.hasOwn(objects, project.id))
    .sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((project) => ({ project, object: objects[project.id] as ShelfObject }));
}

// ----------------------------------------------------------------------------
// Répartit les objets le long d'une planche de largeur donnée, en mètres.
// Paramètres : widths est la largeur de chaque objet ; shelfWidth la largeur utile.
// Retour : abscisse du centre de chaque objet, avec des intervalles égaux entre eux.
// ----------------------------------------------------------------------------
export function layoutShelf(widths: readonly number[], shelfWidth: number): number[] {
  if (widths.length === 0) return [];
  const used = widths.reduce((sum, width) => sum + width, 0);
  const gap = Math.max(0, (shelfWidth - used) / (widths.length + 1));
  const centers: number[] = [];
  let cursor = -shelfWidth / 2 + gap;
  for (const width of widths) {
    centers.push(cursor + width / 2);
    cursor += width + gap;
  }
  return centers;
}
