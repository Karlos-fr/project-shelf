// ============================================================================
// XpArt — Fond d'écran, icônes et libellés du bureau Windows XP
// ----------------------------------------------------------------------------
// Libellés du bureau, icônes et fond d'écran d'origine de Windows XP. Les mêmes
// fichiers servent à l'écran 3D du PC et à l'interface HTML zoomée.
// ============================================================================
import type { Locale } from '../domain/locale.ts';

// Résolution interne du bureau : celle d'un écran 17 pouces de l'époque.
export const XP_WIDTH = 1024;
export const XP_HEIGHT = 768;
export const XP_TASKBAR = 30;

export const XP_LABELS = {
  fr: {
    start: 'démarrer', myComputer: 'Poste de travail', myDocuments: 'Mes documents', recycleBin: 'Corbeille',
    myPictures: 'Mes images', myMusic: 'Ma musique', controlPanel: 'Panneau de configuration', help: 'Aide et support',
    search: 'Rechercher', run: 'Exécuter…', allPrograms: 'Tous les programmes', logOff: 'Fermer la session',
    turnOff: 'Arrêter l’ordinateur', desktop: 'Bureau', shortcut: 'Raccourci vers', exit: '← Quitter l’écran',
  },
  en: {
    start: 'start', myComputer: 'My Computer', myDocuments: 'My Documents', recycleBin: 'Recycle Bin',
    myPictures: 'My Pictures', myMusic: 'My Music', controlPanel: 'Control Panel', help: 'Help and Support',
    search: 'Search', run: 'Run…', allPrograms: 'All Programs', logOff: 'Log Off',
    turnOff: 'Turn Off Computer', desktop: 'Desktop', shortcut: 'Shortcut to', exit: '← Leave the screen',
  },
} as const satisfies Record<Locale, Record<string, string>>;

// Nom de session affiché en haut du menu Démarrer.
export const XP_USER = 'Karlos';

// Fichiers d'origine de Windows XP servis sous /room/xp/ (provenance : docs/xp-assets.md).
export const XP_FILES = {
  wallpaper: 'bliss.jpg', flag: 'flag.png', user: 'user.png', computer: 'computer.png', documents: 'documents.png',
  pictures: 'pictures.png', music: 'music.png', recycle: 'recycle.png', controlPanel: 'control-panel.png', help: 'help.png',
  search: 'search.png', run: 'run.png', logOff: 'log-off.png', turnOff: 'turn-off.png', allPrograms: 'all-programs.ico',
} as const;

// URL d'un fichier XP, base de déploiement incluse.
export function xpAsset(base: string, name: keyof typeof XP_FILES): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}room/xp/${XP_FILES[name]}`;
}

// Petite flèche de raccourci, en bas à gauche des icônes de projet.
export const SHORTCUT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
<rect x=".5" y=".5" width="15" height="15" fill="#fff" stroke="#7a7a7a"/><path d="M4 12c0-5 3-7 7-7V3l3 3.5L11 10V8c-3 0-5 1-7 4z" fill="#1d4fc4"/></svg>`;

export function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
