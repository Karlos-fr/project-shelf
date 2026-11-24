// ============================================================================
// RenderQuality — Densité de pixels de la chambre selon la taille du cadre
// ----------------------------------------------------------------------------
// Fonction pure : sur un grand écran à forte densité (4K, Retina en plein écran), dessiner
// à la densité native multiplie le nombre de pixels sans gain visible à cette distance.
// On plafonne le nombre de pixels dessinés, sans jamais descendre sous la densité 1 d'un
// écran ordinaire. Aucun accès au DOM : la scène fournit la taille et la densité.
// ============================================================================

// Pixels dessinés au plus par image, au-delà de la densité 1 (environ 2560 x 1600).
export const PIXEL_BUDGET = 4_000_000;
// Densité maximale, même pour un petit cadre sur un écran très dense.
export const MAX_PIXEL_RATIO = 2;

// ----------------------------------------------------------------------------
// Densité de pixels à donner au rendu.
//
// Paramètres :
// - width, height : taille du canvas en pixels CSS.
// - devicePixelRatio : densité de l'écran.
//
// Retour : densité plafonnée par MAX_PIXEL_RATIO et PIXEL_BUDGET, jamais inférieure à
// min(devicePixelRatio, 1) : un écran ordinaire garde sa netteté native.
// ----------------------------------------------------------------------------
export function pixelRatioFor(width: number, height: number, devicePixelRatio: number): number {
  const native = Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
  const area = width * height;
  if (area <= 0) return native;
  const budget = Math.sqrt(PIXEL_BUDGET / area);
  return Math.max(Math.min(native, budget), Math.min(devicePixelRatio, 1));
}
