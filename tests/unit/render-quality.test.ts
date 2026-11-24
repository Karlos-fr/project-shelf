// ============================================================================
// RenderQualityTest — Plafond de pixels dessinés par la chambre
// ----------------------------------------------------------------------------
// Vérifie que la densité suit l'écran tant que le budget le permet, qu'elle baisse sur
// un grand cadre très dense, et qu'elle ne descend jamais sous 1 sur un écran ordinaire.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { pixelRatioFor, PIXEL_BUDGET } from '../../src/room/render-quality.ts';

describe('pixelRatioFor', () => {
  it('garde la densité native d’un portable Retina de taille courante', () => {
    expect(pixelRatioFor(1440, 900, 2)).toBeCloseTo(Math.min(2, Math.sqrt(PIXEL_BUDGET / (1440 * 900))), 6);
    expect(pixelRatioFor(1280, 720, 2)).toBe(2);
  });

  it('plafonne un grand cadre 4K à forte densité au budget de pixels', () => {
    const ratio = pixelRatioFor(1920, 1080, 2);
    expect(1920 * 1080 * ratio * ratio).toBeCloseTo(PIXEL_BUDGET, -2);
    expect(ratio).toBeLessThan(2);
  });

  it('ne descend jamais sous la densité 1 d’un écran ordinaire', () => {
    expect(pixelRatioFor(3840, 2160, 1)).toBe(1);
    expect(pixelRatioFor(3840, 2160, 1.5)).toBe(1);
  });

  it('respecte une densité inférieure à 1 (zoom arrière du navigateur)', () => {
    expect(pixelRatioFor(1920, 1080, 0.8)).toBe(0.8);
  });
});
