// ============================================================================
// XpArt — Fond d'écran, icônes et libellés du bureau Windows XP
// ----------------------------------------------------------------------------
// Libellés du bureau, icônes et fond d'écran d'origine de Windows XP. Les mêmes
// fichiers servent à l'écran 3D du PC et à l'interface HTML zoomée.
// ============================================================================
import type { Locale } from '../domain/locale.ts';

// Largeur interne du bureau, en pixels : celle d'un écran 17 pouces de l'époque (1024 x 768).
export const XP_WIDTH = 1024;
// Hauteur interne du bureau, en pixels.
export const XP_HEIGHT = 768;
// Hauteur de la barre des tâches de Luna, en pixels.
export const XP_TASKBAR = 30;
// Rayon des coins de la dalle du CRT, en pixels du bureau : l'interface HTML s'arrondit pareil.
export const XP_CORNER = 34;

// Libellés du bureau XP, des fenêtres et des écrans d'allumage, en français et en anglais.
export const XP_LABELS = {
  fr: {
    start: 'démarrer', myComputer: 'Poste de travail', myDocuments: 'Mes documents', recycleBin: 'Corbeille',
    myPictures: 'Mes images', myMusic: 'Ma musique', controlPanel: 'Panneau de configuration', help: 'Aide et support',
    search: 'Rechercher', run: 'Exécuter…', allPrograms: 'Tous les programmes', logOff: 'Fermer la session',
    turnOff: 'Arrêter l’ordinateur', desktop: 'Bureau', shortcut: 'Raccourci vers', exit: '← Quitter l’écran',
    minimize: 'Réduire', maximize: 'Agrandir', restore: 'Restaurer', close: 'Fermer',
    menuFile: 'Fichier', menuEdit: 'Edition', menuView: 'Affichage', menuFavorites: 'Favoris', menuTools: 'Outils', menuHelp: '?',
    back: 'Précédente', forward: 'Suivante', stop: 'Arrêter', refresh: 'Actualiser', home: 'Démarrage', favorites: 'Favoris',
    history: 'Historique', folders: 'Dossiers', up: 'Dossier parent', address: 'Adresse', go: 'OK', links: 'Liens',
    done: 'Terminé', internet: 'Internet', openInTab: 'Ouvrir dans un nouvel onglet', ieTitle: 'Microsoft Internet Explorer',
    player: 'Lecteur Windows Media', nowPlaying: 'En cours de lecture', mediaGuide: 'Guide des médias', rip: 'Extraire le CD',
    library: 'Bibliothèque', radio: 'Radio', burn: 'Graver', sync: 'Synchroniser', play: 'Lecture', pause: 'Pause',
    mute: 'Muet', volume: 'Volume', seek: 'Position', fullscreen: 'Plein écran',
    systemTasks: 'Gestion du système', fileTasks: 'Gestion des fichiers et dossiers', otherPlaces: 'Autres emplacements',
    details: 'Détails', viewSystemInfo: 'Afficher les informations système', addRemove: 'Ajouter ou supprimer des programmes',
    makeFolder: 'Créer un nouveau dossier', shareFolder: 'Partager ce dossier', storedFiles: 'Fichiers stockés sur cet ordinateur',
    hardDisks: 'Disques durs', removable: 'Périphériques utilisant des supports amovibles', localDisk: 'Disque local (C:)',
    cdDrive: 'Lecteur CD (D:)', systemFolder: 'Dossier système', fileFolder: 'Dossier de fichiers', objects: 'objet(s)',
    emptyFolder: 'Ce dossier est vide.',
    welcome: 'bienvenue', shuttingDown: 'Windows s’arrête…',
  },
  en: {
    start: 'start', myComputer: 'My Computer', myDocuments: 'My Documents', recycleBin: 'Recycle Bin',
    myPictures: 'My Pictures', myMusic: 'My Music', controlPanel: 'Control Panel', help: 'Help and Support',
    search: 'Search', run: 'Run…', allPrograms: 'All Programs', logOff: 'Log Off',
    turnOff: 'Turn Off Computer', desktop: 'Desktop', shortcut: 'Shortcut to', exit: '← Leave the screen',
    minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore Down', close: 'Close',
    menuFile: 'File', menuEdit: 'Edit', menuView: 'View', menuFavorites: 'Favorites', menuTools: 'Tools', menuHelp: 'Help',
    back: 'Back', forward: 'Forward', stop: 'Stop', refresh: 'Refresh', home: 'Home', favorites: 'Favorites',
    history: 'History', folders: 'Folders', up: 'Up', address: 'Address', go: 'Go', links: 'Links',
    done: 'Done', internet: 'Internet', openInTab: 'Open in a new tab', ieTitle: 'Microsoft Internet Explorer',
    player: 'Windows Media Player', nowPlaying: 'Now Playing', mediaGuide: 'Media Guide', rip: 'Copy from CD',
    library: 'Media Library', radio: 'Radio Tuner', burn: 'Copy to CD or Device', sync: 'Sync', play: 'Play', pause: 'Pause',
    mute: 'Mute', volume: 'Volume', seek: 'Seek', fullscreen: 'Full Screen',
    systemTasks: 'System Tasks', fileTasks: 'File and Folder Tasks', otherPlaces: 'Other Places',
    details: 'Details', viewSystemInfo: 'View system information', addRemove: 'Add or remove programs',
    makeFolder: 'Make a new folder', shareFolder: 'Share this folder', storedFiles: 'Files Stored on This Computer',
    hardDisks: 'Hard Disk Drives', removable: 'Devices with Removable Storage', localDisk: 'Local Disk (C:)',
    cdDrive: 'CD Drive (D:)', systemFolder: 'System Folder', fileFolder: 'File Folder', objects: 'object(s)',
    emptyFolder: 'This folder is empty.',
    welcome: 'welcome', shuttingDown: 'Windows is shutting down…',
  },
} as const satisfies Record<Locale, Record<string, string>>;

// Nom de session affiché en haut du menu Démarrer.
export const XP_USER = 'Karlos';

// Fichiers d'origine de Windows XP servis sous /room/xp/ (provenance : docs/xp-assets.md).
export const XP_FILES = {
  wallpaper: 'bliss.jpg', flag: 'flag.png', user: 'user.png', computer: 'computer.png', documents: 'documents.png',
  pictures: 'pictures.png', music: 'music.png', recycle: 'recycle.png', controlPanel: 'control-panel.png', help: 'help.png',
  search: 'search.png', run: 'run.png', logOff: 'log-off.png', turnOff: 'turn-off.png', allPrograms: 'all-programs.ico',
  ie: 'ie.png', player: 'wmp.png', playerSmall: 'wmp-small.png', computerSmall: 'computer-small.png',
  documentsSmall: 'documents-small.png', folderSmall: 'folder-small.png', folder: 'folder.png', disk: 'disk.png', cd: 'cd.png',
  back: 'back.png', forward: 'forward.png', up: 'up.png', stop: 'stop.png', refresh: 'refresh.png', home: 'home.png',
  searchLarge: 'search-large.png', favorites: 'favorites.png', history: 'history.png', go: 'go.png', throbber: 'throbber.png',
  recycleSmall: 'recycle-small.png', logo: 'logo.png',
} as const;
export type XpFile = keyof typeof XP_FILES;

// URL d'un fichier XP, base de déploiement incluse.
export function xpAsset(base: string, name: keyof typeof XP_FILES): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}room/xp/${XP_FILES[name]}`;
}

// Petite flèche de raccourci, en bas à gauche des icônes de projet.
export const SHORTCUT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
<rect x=".5" y=".5" width="15" height="15" fill="#fff" stroke="#7a7a7a"/><path d="M4 12c0-5 3-7 7-7V3l3 3.5L11 10V8c-3 0-5 1-7 4z" fill="#1d4fc4"/></svg>`;

// ----------------------------------------------------------------------------
// URL data: d'une image SVG écrite en ligne (flèche des raccourcis, icônes redessinées).
// ----------------------------------------------------------------------------
export function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
