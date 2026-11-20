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
  shelfTitle: 'The shelf', shelfLead: 'Each project, in the box of its era.', shelfIdle: 'Hover an object on the shelf',
  shelfHint: 'Click an object to move closer · ← → to browse', shelfHintZoomed: 'Click the object or press Esc to step back · ← → next object',
  shelfOpen: 'Open the project', shelfLoading: 'Setting up the shelf…', shelfIndex: 'Objects on the shelf',
  shelfCredits: 'Box art © their publishers. Walnut veneer and HDRI: Poly Haven (CC0).',
  shelfBack: '← Back to the showcase', shelfOtherLocale: 'Français', shelfPageTitle: 'The shelf — a 3D showcase in real time',
  roomPageTitle: 'The bedroom — a 3D showcase in real time', roomLead: 'A late-90s bedroom: boxed projects on the shelf, every project on the PC desktop.',
  roomLoading: 'Tidying up the bedroom…', roomViews: 'Viewpoints', roomOverview: 'Whole room', roomDesk: 'Desk', roomShelf: 'Shelf', roomScreen: 'Computer', roomPoster: 'Poster', roomPower: 'Power button', roomPowerOff: 'The computer is off: press the button on the tower.',
  roomHint: 'Click the desk, the computer screen, the shelf or the poster to move closer · Esc to step back', roomHintShelf: 'Click a box to look at it · ← → to browse · Esc to step back',
  roomIdle: 'Hover a box on the shelf', roomIndex: 'Projects in the room', roomFailed: 'The 3D bedroom could not start in this browser. The projects are listed below.', roomNoWebGpu: 'The 3D bedroom needs WebGPU, which this browser does not provide (use a recent Chrome or Edge with hardware acceleration on). The projects are listed below.',
  roomCredits: 'Box art © their publishers. Ash (stained as beech), oak, wall textures and HDRI: Poly Haven (CC0). LEGO piece geometry: LDraw library (CC BY 2.0); LEGO® is a trademark of the LEGO Group, which does not sponsor this site.',
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
  shelfTitle: 'L’étagère', shelfLead: 'Chaque projet, dans la boîte de son époque.', shelfIdle: 'Survole un objet de l’étagère',
  shelfHint: 'Clic sur un objet pour s’approcher · ← → pour parcourir', shelfHintZoomed: 'Clic sur l’objet ou Échap pour reculer · ← → objet voisin',
  shelfOpen: 'Voir le projet', shelfLoading: 'Installation de l’étagère…', shelfIndex: 'Objets de l’étagère',
  shelfCredits: 'Jaquettes © leurs éditeurs. Placage de noyer et HDRI : Poly Haven (CC0).',
  shelfBack: '← Retour à la vitrine', shelfOtherLocale: 'English', shelfPageTitle: 'L’étagère — une vitrine 3D en temps réel',
  roomPageTitle: 'La chambre — une vitrine 3D en temps réel', roomLead: 'Une chambre de la fin des années 90 : les projets en boîte sur l’étagère, tous les projets sur le bureau du PC.',
  roomLoading: 'On range la chambre…', roomViews: 'Points de vue', roomOverview: 'Vue d’ensemble', roomDesk: 'Le bureau', roomShelf: 'L’étagère', roomScreen: 'L’ordinateur', roomPoster: 'Le poster', roomPower: 'Bouton d’alimentation', roomPowerOff: 'L’ordinateur est éteint : appuie sur le bouton de la tour.',
  roomHint: 'Clic sur le bureau, l’écran de l’ordinateur, l’étagère ou le poster pour s’approcher · Échap pour reculer', roomHintShelf: 'Clic sur une boîte pour la regarder · ← → pour parcourir · Échap pour reculer',
  roomIdle: 'Survole une boîte de l’étagère', roomIndex: 'Projets de la chambre', roomFailed: 'La chambre 3D n’a pas pu démarrer dans ce navigateur. Les projets sont listés plus bas.', roomNoWebGpu: 'La chambre 3D a besoin de WebGPU, que ce navigateur ne fournit pas (Chrome ou Edge récent, accélération matérielle activée). Les projets sont listés plus bas.',
  roomCredits: 'Jaquettes © leurs éditeurs. Textures de frêne (teinté hêtre), chêne, murs et HDRI : Poly Haven (CC0). Géométrie des pièces LEGO : bibliothèque LDraw (CC BY 2.0) ; LEGO® est une marque du groupe LEGO, qui ne parraine pas ce site.',
  playVideo: 'Lire la vidéo', soundOn: 'Activer le son', soundOff: 'Couper le son', fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran', loadingProject: 'Chargement du projet…',
  projectLoadError: 'Le projet n’a pas pu être chargé.', openFullPage: 'Ouvrir la page complète',
  projectOne: 'projet', projectOther: 'projets',
  language: 'Langue', prototype: 'Prototype', active: 'En développement', stable: 'Stable', archived: 'Archivé',
};

// Les deux dictionnaires sont immuables ; le sélecteur ne réécrit pas leur contenu.
export const MESSAGES: Readonly<Localized<InterfaceMessages>> = Object.freeze({
  en: Object.freeze(EN_MESSAGES), fr: Object.freeze(FR_MESSAGES),
});
