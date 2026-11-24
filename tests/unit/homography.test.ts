// ============================================================================
// HomographyTest — Plaquage du bureau XP sur les coins projetés de la dalle
// ----------------------------------------------------------------------------
// Vérifie que la matrix3d envoie le rectangle sur le quadrilatère visé, qu'un rectangle
// identique donne l'identité, et qu'un quadrilatère dégénéré ou presque aplati est refusé
// (null) au lieu de produire une matrice démesurée.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { quadTransform } from '../../src/room/homography.ts';

// Applique la matrix3d CSS (colonnes) à un point (x, y, 0, 1), avec division perspective.
function apply(css: string, x: number, y: number): [number, number] {
  const m = css.slice(9, -1).split(',').map(Number);
  const X = m[0]! * x + m[4]! * y + m[12]!;
  const Y = m[1]! * x + m[5]! * y + m[13]!;
  const W = m[3]! * x + m[7]! * y + m[15]!;
  return [X / W, Y / W];
}

describe('quadTransform', () => {
  it('plaque les quatre coins du rectangle sur le quadrilatère en perspective', () => {
    const quad = [[100, 50], [400, 80], [380, 300], [120, 260]] as const;
    const css = quadTransform(1024, 768, quad);
    expect(css).not.toBeNull();
    const corners: [number, number][] = [[0, 0], [1024, 0], [1024, 768], [0, 768]];
    corners.forEach(([x, y], i) => {
      const [u, v] = apply(css!, x, y);
      expect(u).toBeCloseTo(quad[i]![0], 3);
      expect(v).toBeCloseTo(quad[i]![1], 3);
    });
  });

  it('rend l’identité quand le quadrilatère est le rectangle lui-même', () => {
    const css = quadTransform(1024, 768, [[0, 0], [1024, 0], [1024, 768], [0, 768]]);
    expect(css).toBe('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
  });

  it('refuse un quadrilatère dégénéré (coins confondus ou alignés)', () => {
    expect(quadTransform(1024, 768, [[10, 10], [10, 10], [10, 10], [10, 10]])).toBeNull();
    expect(quadTransform(1024, 768, [[0, 0], [100, 0], [200, 0], [300, 0]])).toBeNull();
  });

  it('refuse un quadrilatère presque aplati au lieu de rendre une matrice démesurée', () => {
    // Dalle vue exactement par la tranche : les coins s'écartent d'un millionième de pixel.
    expect(quadTransform(1024, 768, [[0, 0], [100, 0.000001], [200, 0], [300, 0.000001]])).toBeNull();
    expect(quadTransform(1024, 768, [[500, 100], [500.000001, 100], [500.000001, 600], [500, 600]])).toBeNull();
  });
});
