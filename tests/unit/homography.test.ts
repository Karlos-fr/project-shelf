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
});
