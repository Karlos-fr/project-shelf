// ============================================================================
// RoomLayout — Plan de la chambre, partagé par ses modules
// ----------------------------------------------------------------------------
// Dimensions intérieures de la pièce, fenêtre, porte, bureau et ampoule, en mètres. Repère :
// x de gauche à droite, y vers le haut depuis le sol, z du mur du fond (BACK) au mur
// d'entrée (FRONT). Constantes pures : aucun objet Three.js n'est créé ici.
// ============================================================================

// Demi-largeur intérieure de la pièce : les murs sont en x = -RX et x = +RX.
export const RX = 1.9;
// Face intérieure du mur du fond (fenêtre, bureau) et du mur d'entrée (porte).
export const BACK = -1.6;
export const FRONT = 1.8;
// Hauteur sous plafond.
export const RH = 2.5;
// Épaisseur des murs.
export const WALL = 0.15;
// Fenêtre du mur du fond : centre en x, largeur, bas et haut de l'ouverture.
export const WIN = { x: 1.05, w: 0.95, y0: 0.95, y1: 2.2 } as const;
// Porte de la chambre, au milieu de la moitié gauche du mur d'entrée.
export const DOOR = { x: -0.95 } as const;
// Bureau en hêtre contre le mur du fond : centre (x, z), largeur, profondeur, hauteur du plateau.
export const DESK = { x: -0.15, z: BACK + 0.38, w: 1.4, d: 0.7, h: 0.74 } as const;
// Teinte du hêtre clair (placage de frêne Poly Haven réchauffé), commune aux trois meubles.
export const BEECH = { tint: 0xf7dcc0, brightness: 1.25, normalScale: 0.9 } as const;
// Ampoule nue au bout de son fil, au milieu du plafond.
export const BULB = { x: 0, y: RH - 0.55, z: (BACK + FRONT) / 2 } as const;
