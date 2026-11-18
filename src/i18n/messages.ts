// ============================================================================
// InterfaceMessages — Libellés communs en anglais et en français
// ----------------------------------------------------------------------------
// Ces textes décrivent l'interface, pas les projets ou leurs catégories.
// Les catégories traduites resteront exclusivement dans le catalogue éditorial.
// ============================================================================
import type { Localized } from '../domain/locale.ts';

// Dictionnaire anglais de référence ; ses clés définissent le contrat de traduction.
const EN_MESSAGES = {
  featured: 'Featured', allProjects: 'All projects', searchProjects: 'Search projects',
  searchPlaceholder: 'Name, technology, keyword…', categories: 'Categories',
  resetFilters: 'Reset filters', sortBy: 'Sort by', recentlyUpdated: 'Recently updated',
  newestProjects: 'Newest projects', noResults: 'No projects found',
  noResultsHint: 'Try another search or reset the filters.', closeProject: 'Close project',
  viewProject: 'View project', readPreview: 'Play this preview', pauseRotation: 'Pause rotation',
  resumeRotation: 'Resume rotation', previousProject: 'Previous project', nextProject: 'Next project',
  privateRepository: 'Private repository', viewSource: 'View source', tryDemo: 'Try demo',
  visitWebsite: 'Visit website', viewRelease: 'View release', documentation: 'Documentation',
  createdOn: 'Created', updatedOn: 'Updated', features: 'Key features', technologies: 'Technologies',
  limits: 'Current limitations', motivation: 'About the project', video: 'Video',
  rollLine1: 'rebuilds yesterday\'s games, byte by byte.', rollLine2: 'makes the living-room TV shine.',
  rollLine3: 'ports whole engines to the browser.', rollLine4: 'codes out of pure curiosity.',
  playVideo: 'Play video', soundOn: 'Turn sound on', soundOff: 'Mute', fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', loadingProject: 'Loading project…',
  projectLoadError: 'The project could not be loaded.', openFullPage: 'Open the full page',
  projectOne: 'project', projectOther: 'projects',
  language: 'Language', prototype: 'Prototype', active: 'In development', stable: 'Stable', archived: 'Archived',
} as const;

export type InterfaceMessages = { readonly [Key in keyof typeof EN_MESSAGES]: string };

// Le type exige exactement les mêmes clés, sans imposer les valeurs anglaises.
const FR_MESSAGES: InterfaceMessages = {
  featured: 'À la une', allProjects: 'Tous les projets', searchProjects: 'Rechercher des projets',
  searchPlaceholder: 'Nom, technologie, mot-clé…', categories: 'Catégories',
  resetFilters: 'Réinitialiser les filtres', sortBy: 'Trier par', recentlyUpdated: 'Dernières mises à jour',
  newestProjects: 'Projets les plus récents', noResults: 'Aucun projet trouvé',
  noResultsHint: 'Essayez une autre recherche ou réinitialisez les filtres.', closeProject: 'Fermer la fiche',
  viewProject: 'Voir le projet', readPreview: 'Lire cet aperçu', pauseRotation: 'Arrêter le défilement',
  resumeRotation: 'Reprendre le défilement', previousProject: 'Projet précédent', nextProject: 'Projet suivant',
  privateRepository: 'Dépôt privé', viewSource: 'Voir les sources', tryDemo: 'Essayer la démo',
  visitWebsite: 'Visiter le site', viewRelease: 'Voir la version disponible', documentation: 'Documentation',
  createdOn: 'Création', updatedOn: 'Mise à jour', features: 'Fonctionnalités clés', technologies: 'Technologies',
  limits: 'Limites actuelles', motivation: 'À propos du projet', video: 'Vidéo',
  rollLine1: 'rebâtit des jeux d\'hier, octet par octet.', rollLine2: 'fait briller la TV du salon.',
  rollLine3: 'porte des moteurs entiers dans le navigateur.', rollLine4: 'code par pure curiosité.',
  playVideo: 'Lire la vidéo', soundOn: 'Activer le son', soundOff: 'Couper le son', fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran', loadingProject: 'Chargement du projet…',
  projectLoadError: 'Le projet n’a pas pu être chargé.', openFullPage: 'Ouvrir la page complète',
  projectOne: 'projet', projectOther: 'projets',
  language: 'Langue', prototype: 'Prototype', active: 'En développement', stable: 'Stable', archived: 'Archivé',
};

// Les deux dictionnaires sont immuables ; le sélecteur ne réécrit pas leur contenu.
export const MESSAGES: Readonly<Localized<InterfaceMessages>> = Object.freeze({
  en: Object.freeze(EN_MESSAGES), fr: Object.freeze(FR_MESSAGES),
});
